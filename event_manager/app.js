/*

   Accessible Olli Telemetry Simulation Controller
    - Telemetry data
    - Simulation mode
    
    pdykes@us.ibm.com

*/

var config = require('config');

var module_name = config.get("agents.event_manager.module_name");

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

// web server setup function

var express = require('express'),
    bodyParser = require('body-parser');

var agent_name = "agent_proxy";
var agent_version = "0.0.1";

var app = express();

app.use(bodyParser.json());

// setup the database follow...

var net = require('net');
var fs = require('fs');
var async = require('async');
var config = require('config');
var request = require('request');
// var follow = require('follow');
var follow = require('couchdb-global-changes');
var commandLineArgs = require('command-line-args');
// Generate a v4 UUID (random)
const uuid = require('uuid/v4');
// var rule_engine = require('node-rules');

// async waterfall

var async = require('async');
var waterfall = require('async-waterfall');

var http_port = config.get("agents.event_manager.port");

// database

var database_url = config.get("global.nosql_url");
var database_user = config.get("global.nosql_user");
var database_password = config.get("global.nosql_password");
var database = config.get("agents.event_manager.events_database");

var couch = null;
var events_db = null;
try {
    couch = require('nano')({
        url: database_url,
        parseUrl: false
    });
    events_db = couch.use(database);
} catch (err) {
    console.log("database init failure", err);
}

// var rules_input = "rules.json";

var prefix_text = "[" + config.get("agents.event_manager.module_Name") + "]";

// var rules_content = null;

// var fact = [];

// Load the rules

var simulation_event_rules = null;
var simulation_by_offset_rules = [];
var simulation_rules_input_file = config.get("agents.event_manager.simulation_event_rules");

var telemetry_event_rules = null;
var telemetry_by_offset_rules = [];
var telemetry_rules_input_file = config.get("agents.event_manager.telemetry_event_rules");

if (process.env.NODE_CONFIG_DIR !== undefined) {
    var file_path = process.env.NODE_CONFIG_DIR + "/" + simulation_rules_input_file;
    if (fs.existsSync(file_path)) {
        try {
            var simulation_event_rules_data = fs.readFileSync(file_path);
            // Define to JSON type
            simulation_event_rules = JSON.parse(simulation_event_rules_data);
        } catch (err) {
            console.log(prefix_text, "Error Handling Rules, check:", file_path);
        }
    }
} else {
    console.log("Error NODE_CONFIG_DIR not set, please set and restart");
    return;
}

if (process.env.NODE_CONFIG_DIR !== undefined) {
    var file_path = process.env.NODE_CONFIG_DIR + "/" + telemetry_rules_input_file;
    if (fs.existsSync(file_path)) {
        try {
            var telemetry_event_rules_data = fs.readFileSync(file_path);
            // Define to JSON type
            telemetry_event_rules = JSON.parse(telemetry_event_rules_data);
        } catch (err) {
            console.log(prefix_text, "Error Handling Rules, check:", file_path);
        }
    }
} else {
    console.log("Error NODE_CONFIG_DIR not set, please set and restart");
    return;
}

// Process rules during startup

for (key in simulation_event_rules) { // fill out sparse array
    console.log(prefix_text, "Processing key", key);
    var index = simulation_event_rules[key].simulation_time;
    simulation_by_offset_rules[index] = [];
    simulation_by_offset_rules[index]['events'] = simulation_event_rules[key].events;
    simulation_by_offset_rules[index]['index'] = simulation_event_rules[key].simulation_time;
}

for (key in telemetry_event_rules) { // fill out sparse array
    console.log(prefix_text, "Processing key", key);
    var index = telemetry_event_rules[key].offset;
    telemetry_by_offset_rules[index] = [];
    telemetry_by_offset_rules[index]['events'] = telemetry_event_rules[key].events;
    telemetry_by_offset_rules[index]['index'] = telemetry_event_rules[key].offset;
}

simulation_by_offset_rules.forEach(function (element) {
    debug("simulation_by_offset_rules data structure:");
    debug("   Delta_time:", element.index);
    debug("   Events:", element.events);
});

telemetry_by_offset_rules.forEach(function (element) {
    debug("telemetry_by_offset_rules data structure:");
    debug("   Delta_time:", element.index);
    debug("   Events:", element.events);
});


/*
var listener_target =
    config.get("global.nosql_url") +
    "/telemetry_transitions/" +
    "_db_updates";
*/

/* var listener_target =
    config.get("global.nosql_url") + "/_db_updates";
    */
var listener_target =
    config.get("global.nosql_url");

debug("Listener target:", listener_target);

var opts = {
    couch: listener_target,
    since: "now",
    include: "^.*_transitions$",
    namespace: "event_list",
    include_docs: true
}; // Same options paramters as before

debug("Feed parameters:", JSON.stringify(opts, null, 4));

var feed = new follow(opts);

//  todo
//    support when reader fails, just wiat
//    post items that have happened > 1 second to database
//    create agent that can process this and put a clean version
//     of data

var help = "help.txt";
// command line options

var cli_optionDefinitions = [
    {
        name: 'verbose',
        alias: 'v',
        type: Boolean,
        defaultValue: false
    },
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        defaultValue: false
    }
];

var cli_options = commandLineArgs(cli_optionDefinitions);

debug("Command line options provided:" + JSON.stringify(cli_options, null, 4));

if (cli_options.help !== null) {
    if (cli_options.help == true) {
        fs.readFile("help.txt", 'utf8', function (err, data) {
            if (err) throw err;
            console.log(data);
        });
        return;
    }
}

var event_template = {
    "event": "tbd",
    "agent_id": "event_manager",
    "agent_instance": "0.0.0.1",
    "payload": {

    }
};


function evaluate_data(submit_record, callback) {

    debug("Phase 1: Prepare proxy client");
    callback(null, submit_record);
}


function insert_asset_record(event_body, callback) {

    debug("Phase 2: Database update to " + event_body._id);


    try {
        events_db.insert(event_body, function (err, body) {
            if (!err) {
                if (event_body.hasOwnProperty('_rev')) {
                    console.log("Phase 2: Database asset updated:", event_body._id);
                } else {
                    console.log("Phase 2: Database asset created:", event_body._id);
                }
                callback(null, event_body);
            } else {
                console.log("Phase 2: Database asset " + event_body._id + " throwing: ", err);
                callback(err, event_body, req, resp);
            }
        }); // insert
    } catch (err) {
        debug("Phase 2: Database record not found for", event_body._id);
        callback(err, "Phase 2: failure", err);
    }
}

function asset_request_complete(event_body, callback) {
    try {
        debug("Phase 3: Database update complete for", event_body._id);
        callback(null, event_body);
    } catch (err) {
        debug("Phase 3: Database record not found for", event_body._id);
        callback(err, "Phase 3: failure", err);
    }
}

// PJD need to use the to_device record

//---------------------------------------------------------------

process.on('SIGINT', function () {
    console.log(prefix_text, "Caught interrupt signal");

    // clearInterval(simulation_interval_object);
    process.exit();

});



// replication control function

function submit_message_to_agent_proxy(json_message, database) {

    debug("message to send:", json_message);

    var options = {
        uri: proxy_list[database].to_device_url,
        method: 'POST',
        json: json_message
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("Message submitted successfully:", JSON.stringify(json_message, null, 4));
        } else {
            console.log("Agent Initialization Error for " + database + ":", error);

        }
    });

}




function follow_on_error(er) {

    console.error('Since Follow always retries on errors, this must be serious', er);
    // throw er;

}


console.log(prefix_text, "Agent listening on http port:", http_port);
app.listen(http_port);

// ready for interaction, initialize all registered agents...
// assumption all registered agents will be contacted


// web server function

app.post('/', function (request, response) {
    debug("********************** Recieve Post Message *****************************");
    debug(prefix_text, "Incoming Device Request:", JSON.stringify(request.body, null, 4)); // your JSON
    var incoming = request.body;


    // PJD refine this...
    try {
        debug("Incoming Post Message:", incoming);

        waterfall([ //first function needs async.apply to post attributes, reset can get the 
            async.apply(evaluate_data, request, response),
            obtain_asset_record,
            update_asset_record, // asset_record_id, asset_record, kafka_body.event_id
            asset_request_complete
            ],
            function (err, results) {
                debug("Event result:", JSON.stringify(results, null, 4));
                if (err !== null) {
                    debug("Error Result:",
                        err);
                }
            });
    } catch (err) {
        var outgoing_response = failure_template;
        response.status(500).send(JSON.stringify(outgoing_response, null, 4));
        debug(prefix_text, "Error on database write for this message:", JSON.stringify(incoming, null, 4));
        debug(prefix_text, "Error on database write:", err);

    }

    debug("********************** End Post Message *****************************");

});

function follow_on_change(details, feed) {


    debug(prefix_text, "In database:", details.db_name, "Change detected:", details.change.id, "Detailed debug object:", JSON.stringify(details, null, 4), "feed details:", JSON.stringify(feed, null, 4));

    console.log(prefix_text, "In database:", details.db_name, "Change record: ", details.change.id);


    switch (details.change.id) {
        case "telemetry_transition":
            {
                console.log("Event Manager - telemetry rules db", details.db_name, " for record:", details.change.id, "[sim offset:", details.change.doc.transport_data.simulation_offset, "for sim time:", details.change.doc.delta_time, "]");

                var telemetry_ref = details.change.doc;

                var simulation_delta_time = details.change.doc.delta_time;
                var simulation_real_time = details.change.doc.event_time;

                var vehicle_list = telemetry_ref.transport_data.olli_vehicles;

                debug("buses:", Object.keys(telemetry_ref.transport_data.olli_vehicles));

                debug("telemetry transition reference object:", telemetry_ref);


                // process events for each simulation time

                /*
                simulation_by_offset_rules.forEach(function (element) {
                    debug("simulation_by_offset_rules data structure:");
                    debug("   Delta_time:", element.index);
                    debug("   Events:", element.events);
                });
                */

                if (simulation_by_offset_rules.hasOwnProperty(simulation_delta_time)) {
                    debug("Simulation event exist for this instance [" + simulation_delta_time + "]");
                    simulation_by_offset_rules[simulation_delta_time].events.forEach(function (element) {
                        debug("   Events:", JSON.stringify(element, null, 4));
                        var submit_record = {
                            _id: element.name + ':' + uuid() + ':' + simulation_real_time,
                            event: element.event,
                            payload: element.payload
                        };
                        debug("Event/Database record to be posted:", submit_record);
                        waterfall([
                                  async.apply(evaluate_data, submit_record),
                                  insert_asset_record,
                                  asset_request_complete
                                ],
                            function (err, results) {
                                debug("Event result:", JSON.stringify(results, null, 4));
                                if (err !== null) {
                                    debug("Error Result:", err);
                                }
                            });

                    });
                }

                // process events for all and each olli

                // only do this if there are defined rules...

                for (var key in vehicle_list) {

                    var olli_offset = vehicle_list[key].offset;
                    var olli_name = key;

                    console.log("Processing vehicle:", key);

                    if (telemetry_by_offset_rules.hasOwnProperty(olli_offset)) {
                        debug("Telemetry event exist for this instance [" + olli_offset + "]");
                        telemetry_by_offset_rules[olli_offset].events.forEach(function (element) {
                            // debug("   Events:", JSON.stringify(element, null, 4));

                            var release_event = false;
                            if (element.hasOwnProperty("filter")) { // default to all
                                if (element.filter == "all") {
                                    release_event = true;
                                    debug("Filer set - Apply this event to each instance");
                                } else {
                                    if (element.filter == olli_name) {
                                        release_event = true;
                                        debug("Apply this event to specific instance");
                                    }
                                }
                            } else {
                                release_event = true;
                                debug("Filer not set - Apply this event to each instance");
                            }

                            if (release_event) {
                                debug("Fire this event:", JSON.stringify(element, null, 4));
                                var submit_record = {
                                    _id: element.name + ':' + uuid() + ':' + vehicle_list[key].timestamp,
                                    event: element.event,
                                    payload: element.payload
                                };
                                debug("Event/Database record to be posted:", submit_record);
                                waterfall([
                                  async.apply(evaluate_data, submit_record),
                                  insert_asset_record,
                                  asset_request_complete
                                ],
                                    function (err, results) {
                                        debug("Event result:", JSON.stringify(results, null, 4));
                                        if (err !== null) {
                                            debug("Error Result:", err);
                                        }
                                    });
                            }
                        });
                    }
                }
            }
            break;
        default:
            console.log("Record ignored arriving from database:", details.db_name, " record:", details.change.id);
    }
}


feed.on('error', function (er) {
    console.error(prefix_text, 'Since Follow always retries on errors, this must be serious', er);
    // throw er;
});

feed.on('db-persist', function (details) {
    // after this, we can be sure the update sequence has been saved. 
    // when this script is started again, it will pick up just where 
    // it left off and not process any document a second time. 
    console.log("%s processed all documents in the database %s (up to update-sequence %s)", feed.namespace, details.db_name, details.persist.seq);
});

feed.on('db-change', function (details) {
    // console.log(text_prefix, "Event change detected for " + feed.db + ": ", JSON.stringify(change, null, 4));
    follow_on_change(details, feed);
});
