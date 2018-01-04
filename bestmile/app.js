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

// Follow telemetry changes ----------------------------------------------

const telemetry_database = config.get("global.nosql_url")+"/"+config.get("agents.telemetry.database");
debug("Telemetry listener target:", telemetry_database);

const telemetry_feed = new follow.Feed({
    db: telemetry_database,
    since: 'now',
    include_docs: true,
    filter: (doc, req) => doc._id == "telemetry_transition"
});

telemetry_feed.on('change', change => adapter.process_telemetry_transition(change.doc, olliToHermesVehicleIDs))

telemetry_feed.on('error', function(er) {
    console.error('Since Follow always retries on errors, this must be serious', er);
    throw er;
})

telemetry_feed.follow();

// Follow event changes ----------------------------------------------

const events_database = config.get("global.nosql_url")+"/"+config.get("agents.event_manager.events_database");
debug("Events listener target:", events_database);

const event_feed = new follow.Feed({
    db: events_database,
    since: 'now',
    include_docs: true,
    filter: (doc, req) => doc.payload._event_type == "telemetry_rule_event" && doc._id.indexOf("Trip Stop") != -1
});

event_feed.on('change', trip_stop_event => adapter.process_trip_stop_event(trip_stop_event.doc, olliToHermesVehicleIDs))

event_feed.on('error', function(er) {
    console.error('Since Follow always retries on errors, this must be serious', er);
    throw er;
})

event_feed.follow();
