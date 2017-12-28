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
const olliToHermesVehicleIDs = config.get("agents.bestmile.vehicle_ids") || [];
const hermes = config.get("agents.bestmile.hermes_config") || null;
// const hermes = { "host": "localhost", "port": "40000" }

const debug = require("debug")(module_name);

debug("Debug enabled in module: %s", module_name);
debug("Agent name:", agent_name);

// Start Adapter ----------------------------------------------

adapter.start(Object.values(olliToHermesVehicleIDs), hermes)

// Follow database changes ----------------------------------------------

const listener_target = config.get("global.nosql_url")+"/"+config.get("agents.telemetry.database");
debug("Listener target:", listener_target);

const feed = new follow.Feed({
    db: listener_target,
    since: 'now',
    include_docs: true,
    filter: (doc, req) => doc._id == "telemetry_transition"
});

feed.on('change', change => adapter.process_telemetry_transition(change.doc, olliToHermesVehicleIDs))

feed.on('error', function(er) {
    console.error('Since Follow always retries on errors, this must be serious', er);
    throw er;
})

feed.follow();
