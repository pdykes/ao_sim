/*

   BestMile Agent Proxy Client

   bastien.rojanawisut@bestmile.com

*/

// Initialization ----------------------------------------------

const config = require('config');
const follow = require('follow');

const adapter = require('./adapter.js');

const agent_name = config.get("agents.bestmile.name") || "bestmile"
const module_name = config.get("agents.bestmile.module_name") || "bestmile";
const vehicles = config.get("agents.bestmile.vehicle_ids") || [];
const hermes = config.get("agents.bestmile.hermes_config") || null;

const debug = require("debug")(module_name);

debug("Debug enabled in module: %s", module_name);
debug("agent name:", agent_name);

const prefix_text = "[" + agent_name + "]";

// Follow database changes ----------------------------------------------

const listener_target = config.get("global.nosql_url")+"/telemetry_transitions";
debug("Listener target:", listener_target);

const opts = {};
const feed = new follow.Feed(opts);

feed.db            = listener_target;
feed.since         = 'now';
feed.include_docs  = true;

feed.on('change', function(change) {
    switch(change.doc._id){
        case "telemetry_transition":
            adapter.process_telemetry_transition(change.doc)
            break;
        default:
            console.log(prefix_text, "Unknown change: ", JSON.stringify(change, null, 4));
    }
})

feed.on('error', function(er) {
    console.error('Since Follow always retries on errors, this must be serious', er);
    throw er;
})

feed.follow();

// Start Adapter ----------------------------------------------

adapter.start(vehicles, hermes)