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

var agent_name = module_name;
var agent_version = "0.0.1";

var app = express();

app.use(bodyParser.json());

// Ramp status
var RAMP_UNDEPLOYED = 0;
var RAMP_DEPLOYING = 1;
var RAMP_DEPLOYED = 2;

// QStraint status
var QSTRAINT_UNDEPLOYED = 0;
var QSTRAINT_DEPLOYING = 1;
var QSTRAINT_DEPLOYED = 2;

// Simulation status
var SIMULATION_PAUSED = 0;
var SIMULATION_TELEMETRY = 1;
var SIMUlATION_BOARDING = 2;
var SIMULATION_DISEMBARKING = 3;
var SIMULATION_EMERGENCY_STOP = 4;

// special events
var SIM_START_EVENT = "_simulation_start_event";
var SIM_END_EVENT = "_simulation_complete_event";

var TEL_START_EVENT = "_telemetry_start_event";
var TEL_END_EVENT = "_telemetry_complete_event";

var PATRONS_BOARD = "stop_simulation_board_patrons_stop_4";
var PATRONS_EXIT = "stop_simulation_patrons_exit_stop_1";


var operational_status = {
    telemetry_status: "inactive", // are simulation events arrival active or inactive
    simulation_status: "inactive", // are telemetry events arrival active or inactive
    mode: "enabled", // Disabled another option
    iteration: "single", // Continuous another option
    pause_at_stops: false, // should the simulation pause at stops (e.g. on show floor)
    delta_time: 0, // 0 when simulation is not running
    interrupt: true, // Is single or continuous opertions, should
    // interrupt (true) events be honored or not (false)
    emergency_stop: false, // Emergency stop mode enabled (true) or not (false)
    ramp_mode: false, // Is ramp operations enabled (be very careful here)
    ramp_state: RAMP_UNDEPLOYED, // see above
    qstraint_state: QSTRAINT_UNDEPLOYED, // see above  
    simulation_state:  SIMULATION_PAUSED   // se above
};

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

var telemetry_database = config.get("agents.telemetry.database");
var rule_events_database = config.get("agents.event_manager.events_database");

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

var simulation_event_rules = [];
var simulation_by_offset_rules = [];
var simulation_rules_input_file = config.get("agents.event_manager.simulation_event_rules");

var telemetry_event_rules = [];
var telemetry_by_offset_rules = [];
var telemetry_rules_input_file = config.get("agents.event_manager.telemetry_event_rules");


function loadEventRules()
{
    simulation_event_rules = [];
    simulation_by_offset_rules = [];
    simulation_rules_input_file = config.get("agents.event_manager.simulation_event_rules");

    telemetry_event_rules = [];
    telemetry_by_offset_rules = [];
    telemetry_rules_input_file = config.get("agents.event_manager.telemetry_event_rules");

    if (process.env.NODE_CONFIG_DIR !== undefined) {
        for(var i=0; i<simulation_rules_input_file.length; i++) {
            var file_path = process.env.NODE_CONFIG_DIR + "/" + simulation_rules_input_file[i];
            if (fs.existsSync(file_path)) {
                try {
                    var simulation_event_rules_data = fs.readFileSync(file_path);
                    // Define to JSON type
                    simulation_event_rules[i] = JSON.parse(simulation_event_rules_data);
                } catch (err) {
                    console.log(prefix_text, "Error Handling Rules, check:", file_path);
                }
            }
        }
    } else {
        console.log("Error NODE_CONFIG_DIR not set, please set and restart");
        return;
    }

    if (process.env.NODE_CONFIG_DIR !== undefined) {
        for(var i=0; i<telemetry_rules_input_file.length; i++) {
            var file_path = process.env.NODE_CONFIG_DIR + "/" + telemetry_rules_input_file[i];
            if (fs.existsSync(file_path)) {
                try {
                    var telemetry_event_rules_data = fs.readFileSync(file_path);
                    // Define to JSON type
                    telemetry_event_rules[i] = JSON.parse(telemetry_event_rules_data);
                } catch (err) {
                    console.log(prefix_text, "Error Handling Rules, check:", file_path);
                }
            }
        }
        
    } else {
        console.log("Error NODE_CONFIG_DIR not set, please set and restart");
        return;
    }

    // Process rules during startup
    for(var i=0; i<simulation_event_rules.length; i++) {
        for (key in simulation_event_rules[i]) { // fill out sparse array
            console.log(prefix_text, "Processing key", key);
            var index = simulation_event_rules[i][key].simulation_time;
            //simulation_by_offset_rules[index] = [];
            if( typeof simulation_by_offset_rules[index] !== 'object' ) {
                simulation_by_offset_rules[index] = [];
            }

            //simulation_by_offset_rules[index]['events'] = simulation_event_rules[key].events;
            if( typeof simulation_by_offset_rules[index]['events'] !== 'object' )
                simulation_by_offset_rules[index]['events'] = [];

            simulation_by_offset_rules[index]['events'] = 
                simulation_by_offset_rules[index]['events'].concat(simulation_event_rules[i][key].events);

            simulation_by_offset_rules[index]['index'] = simulation_event_rules[i][key].simulation_time;
        }
    }

    for(var i=0; i<telemetry_event_rules.length; i++) {
        for (key in telemetry_event_rules[i]) { // fill out sparse array
            console.log(prefix_text, "Processing key", key);
            var index = telemetry_event_rules[i][key].offset;

            if( typeof telemetry_by_offset_rules[index] !== 'object' ) {
                telemetry_by_offset_rules[index] = [];
            }

            if( typeof telemetry_by_offset_rules[index]['events'] !== 'object' ) {
                telemetry_by_offset_rules[index]['events'] = [];
                console.log("resetting telemetry offset rules ("+index+") to zero");
                //console.log(telemetry_by_offset_rules[index]['events']);
                
            }

            //concat events of each file
            telemetry_by_offset_rules[index]['events'] = 
                telemetry_by_offset_rules[index]['events'].concat(telemetry_event_rules[i][key].events);

            console.log("Event count (" + index + "): " + telemetry_by_offset_rules[index]['events'].length);
            telemetry_by_offset_rules[index]['index'] = telemetry_event_rules[i][key].offset;
        }
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
}

loadEventRules();


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

// READ AND UPDATE LOGIC

// Database operations code

//---------------------------------------------------------------

function evaluate_data(database, database_key, control, operation, callback) {

    try {
        debug("Phase 1: Prepare control operation");

        debug("Operation:", operation);
        debug("Control:", control);

        // expecting more function here potentialy

        callback(null, database, database_key, control, operation);
    } catch (err) {
        debug("Phase 1: Error, evaluate_data");
        callback(err);
    }

}

function obtain_asset_record(database, database_key, control, operation, callback) {

    var db_record_found = false;
    control_event = null;

    // attempt to get record from database
    debug("Phase 2: DB Query, asset:", control + ":" + operation);
    debug("Phase 2: DB Query, db key:" + database_key);

    var control_command = null;

    // clean this up in mvp3

    if ((control == "telemetry_transitions") && (operation == "enable")) {
        control_command = "enabled";
        control_event = {
            _id: database_key
        };
    }

    if ((control == "telemetry_transitions") && (operation == "restart")) {
        control_command = "restart";
        control_event = {
            _id: database_key
        };
    }

    if ((control == "telemetry_transitions") && (operation == "disable")) {
        control_command = "disabled";
        control_event = {
            _id: database_key
        };
    }

    if ((control == "telemetry_transitions") && (operation == "single")) {
        control_command = "single";
        control_event = {
            _id: database_key
        };
    }

    if ((control == "telemetry_transitions") && (operation == "continuous")) {
        control_command = "continuous";
        control_event = {
            _id: database_key
        };
    }



    debug("control_event message:", JSON.stringify(control_event, null, 4));

    try {
        database.get(control_event._id, {
            revs_info: false
        }, function (err, event_body) {
            if (!err) {
                db_record_found = true;
                if (db_record_found) {
                    debug("Phase 2:Database record found:", JSON.stringify(control_event, 4, null));
                    control_event['_rev'] = event_body._rev;
                } else {
                    debug("Phase 2: Database record found for", control_event._id);
                }
                control_event.mode = control_command;
                debug("Phase 2: Attempting to store:", JSON.stringify(control_event, null, 4));
                callback(null, database, database_key, control, operation, control_event);
            } else {
                // this should not occur...
                control_event.mode = control_command;
                debug("Phase 2: Database record not found for", control_event._id);
                callback(null, database, database_key, control, operation, control_event);
            }
        });
    } catch (err) {
        debug("Phase 2: Database record not found for", control_event._id);
        callback(err, "Phase 2: failure", err);
    }
}


function update_asset_record(database, database_key, control, operation, control_event, callback) {

    debug("Phase 3: Database update to " + control);

    try {
        database.insert(control_event, function (err, body) {
            if (!err) {
                if (body.hasOwnProperty('_rev')) {
                    debug("Phase 3: Database asset updated:", control_event._id);
                } else {
                    debug("Phase 3: Database asset created:", control_event._id);
                }
                callback(null, database, database_key, control, operation, control_event);
            } else {
                debug("Phase 3: Database asset " + control_event._id + " throwing: ", err);
                callback(err, database, database_key, control, operation, control_event);
            }
        }); // insert
    } catch (err) {
        debug("Phase 3: Database record not found for", control_event._id);
        callback(err, "Phase 3: failure", err);
    }
}

function asset_request_complete(database, database_key, control, operation, control_event, callback) {
    try {
        debug("Phase 4: Database update complete for", control_event._id);
        callback(null, database, database_key, control, operation, control_event);
    } catch (err) {
        debug("Phase 4: Database record not found for", control_event._id);
        callback(err, "Phase 4: failure", err);
    }
}

// ------------------------------------------------------

function update_control(dbname, key, state) {

    // database, database_key, control, operation

    // control   - telemetry_transitions
    // operation - enable

    debug("control handler");

    var db = null;

    try {
        debug("Control Database  uri:" +
            database_url +
            " database name:" +
            dbname);

        couch = require('nano')({
            url: database_url,
            parseUrl: false
        });
        db = couch.use(dbname);
    } catch (err) {
        console.log("database init failure", err);
    }

    try {
        debug(prefix_text, "Database operation starting");

        debug("waterfall attributes:", key, dbname, state);

        waterfall([
            async.apply(evaluate_data,
                    db,
                    key,
                    dbname,
                    state),
            obtain_asset_record,
            update_asset_record,
            asset_request_complete
            ],
            function (err, results) {
                debug("Event result:", JSON.stringify(results, null, 4));
                if (err !== null) {
                    debug("Error Result:",
                        err);
                }
            });
        console.log(prefix_text, "Successful operation set " +
            database_key +
            " in database " +
            database_name +
            " now set to " +
            operation_value + " state");
    } catch (err) {
        debug(prefix_text, "Error on database write:", err);

    }

}



// INSERT ONLY LOGIC

function insert_only_evaluate_data(submit_record, callback) {

    debug("Phase 1: Prepare proxy client");
    callback(null, submit_record);
}


function insert_only_asset_record(event_body, callback) {

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
                callback(err, event_body);
            }
        }); // insert
    } catch (err) {
        debug("Phase 2: Database record not found for", event_body._id);
        callback(err, "Phase 2: failure", err);
    }
}

function insert_only_asset_request_complete(event_body, callback) {
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

app.get('/reload', function(request, response) {
    loadEventRules();
});
// web server function - post mvp4b

/*

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

*/

/*

        Key concept: event manager
         a) produces rule events
         b) listens and acts upon them once they are released

        Processing the rule events is completed just like any other
        consumer, this solution will listen for changes (in read-only
        mode) and act upon them to control certain aspects of the simulation.
        
        This code listens to the async rules and acts accordingly.

*/

function follow_on_change(details, feed) {


    debug(prefix_text, "In database:", details.db_name, "Change detected:", details.change.id, "Detailed debug object:", JSON.stringify(details, null, 4), "feed details:", JSON.stringify(feed, null, 4));

    console.log(prefix_text, "In database:", details.db_name, "Change record: ", details.change.id);

    switch (details.db_name) {
        case telemetry_database:
            {
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

                                    // reminder, couchdb does not allow _* variables at root level,
                                    // thus put in payload area, application specific anyway

                                    if (!element.payload.hasOwnProperty('_event_type')) {
                                        console.log("Warning reserved attribute _vehicle attribute in payload, overriding in ", element.name);
                                        element.payload._event_type = "simulation_rule_event";
                                    } else {
                                        element.payload['_event_type'] = "simulation_rule_event";
                                    }

                                    if (!element.payload.hasOwnProperty('_simulation_real_time')) {
                                        console.log("Warning reserved attribute _vehicle attribute in payload, overriding in ", element.name);
                                        element.payload._simulation_real_time = simulation_real_time;
                                    } else {
                                        element.payload['_simulation_real_time'] = simulation_real_time;
                                    }

                                    if (!element.payload.hasOwnProperty('_simulation_delta_time')) {
                                        console.log("Warning reserved attribute _vehicle attribute in payload, overriding in ", element.name);
                                        element.payload._simulation_delta_time = simulation_delta_time;
                                    } else {
                                        element.payload['_simulation_delta_time'] = simulation_delta_time;
                                    }

                                    var submit_record = {
                                        _id: element.name + ':' + uuid() + ':' + simulation_real_time,
                                        event: element.event,
                                        payload: element.payload
                                    };
                                    debug("Event/Database record to be posted:", submit_record);
                                    waterfall([
                                        async.apply(insert_only_evaluate_data, submit_record),
                                        insert_only_asset_record,
                                        insert_only_asset_request_complete
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

                                //console.log("Processing vehicle:", olli_name, " at offset: " + olli_offset);
                                //console.log(telemetry_by_offset_rules);
                                if (telemetry_by_offset_rules.hasOwnProperty(olli_offset)) {
                                    //console.log("Telemetry event exist for this instance [" + olli_offset + "]");
                                    telemetry_by_offset_rules[olli_offset].events.forEach(function (element) {
                                        // debug("   Events:", JSON.stringify(element, null, 4));

                                        var release_event = false;
                                        if (element.hasOwnProperty("filter")) { // default to all
                                            if (element.filter == "all") {
                                                release_event = true;
                                                console.log("Filer set - Apply this event to each instance");
                                            } else {
                                                if (element.filter == olli_name) {
                                                    release_event = true;
                                                    console.log("Apply this event to specific instance");
                                                }
                                            }
                                        } else { // no filter, just process for each vehicle
                                            release_event = true;
                                            console.log("Filer not set - Apply this event to each instance");
                                        }
                                        console.log("Vehicle: "+ olli_name + " release_event: " + release_event);
                                        if (release_event) {
                                            console.log("Fire this event:", JSON.stringify(element, null, 4));

                                            if (!element.hasOwnProperty('payload')) {
                                                element['payload'] = {}
                                            }

                                            if (!element.payload.hasOwnProperty('_vehicle')) {
                                                console.log(prefix_text, "Warning reserved attribute _vehicle attribute in payload, overriding in ", element.name);
                                                element.payload._vehicle = olli_name;
                                            } else {
                                                element.payload['_vehicle'] = olli_name;
                                            }

                                            if (!element.payload.hasOwnProperty('_offset')) {
                                                console.log(prefix_text, "Warning reserved attribute _offset attribute in payload, overriding in ", element.name);
                                                element.payload._offset = olli_offset;
                                            } else {
                                                element.payload['_offset'] = olli_offset;
                                            }

                                            // simulation_delta_time

                                            if (!element.payload.hasOwnProperty('_simulation_delta_time')) {
                                                console.log(prefix_text, "Warning reserved attribute _simulation_delta_time attribute in payload, overriding in ", element.name);
                                                element.payload._simulation_delta_time = simulation_delta_time;
                                            } else {
                                                element.payload['_simulation_delta_time'] = simulation_delta_time;
                                            }

                                            // real-time

                                            if (!element.payload.hasOwnProperty('_simulation_real_time')) {
                                                console.log(prefix_text, "Warning reserved attribute _simulation_real_time attribute in payload, overriding in ", element.name);
                                                element.payload._simulation_real_time = simulation_real_time;
                                            } else {
                                                element.payload['_simulation_real_time'] = simulation_real_time;
                                            }

                                            // real-time

                                            if (!element.payload.hasOwnProperty('_event_type')) {
                                                console.log(prefix_text, "Warning reserved attribute _event_type attribute in payload, overriding in ", element.name);
                                                element.payload._event_type = "telemetry_rule_event";
                                            } else {
                                                element.payload['_event_type'] = "telemetry_rule_event";
                                            }

                                            var submit_record = {
                                                _id: element.name + ':' + uuid() + ':' + vehicle_list[key].timestamp,
                                                event: element.event,
                                                payload: element.payload
                                            };

                                            debug("Event/Database record to be posted:", submit_record);

                                            waterfall([
                                              async.apply(insert_only_evaluate_data, submit_record),
                                              insert_only_asset_record,
                                              insert_only_asset_request_complete
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
                    case "telemetry_control":
                        {
                            if (details.change.doc.mode == "enabled") {
                                operational_status.mode = details.change.doc.mode;
                                console.log(prefix_text, "Telemetry Control - Simulation Enabled");
                            }

                            if (details.change.doc.mode == "disabled") {
                                operational_status.mode = details.change.doc.mode;
                                console.log(prefix_text, "Telemetry Control - Simulation Disabled");
                            }
                            debug(prefix_text, "Operational Status:", JSON.stringify(operational_status, null, 4));
                        }
                        break;
                    case "telemetry_pause_stops":
                        {
                            if (details.change.doc.mode == "enabled") {
                                operational_status.pause_at_stops = details.change.doc.mode;
                                console.log(prefix_text, "Pause for stops - Simulation Enabled");
                            }

                            if (details.change.doc.mode == "disabled") {
                                operational_status.pause_at_stops = details.change.doc.mode;
                                console.log(prefix_text, "Pause for stops - Simulation Disabled");
                            }
                            debug(prefix_text, "Operational Status:", JSON.stringify(operational_status, null, 4));
                        }
                        break;
                    case "telemetry_iteration":
                        {
                            if (details.change.doc.mode == "single") {
                                operational_status.iteration = details.change.doc.mode;
                                console.log(prefix_text, "Iteration Mode - Simulation Iteration Model");
                            }

                            if (details.change.doc.mode == "continuous") {
                                operational_status.iteration = details.change.doc.mode;
                                console.log(prefix_text, "Iteration Mode - Simulation Continuous Model");
                            }
                            debug(prefix_text, "Operational Status:", JSON.stringify(operational_status, null, 4));
                        }
                        break;
                    default:
                        console.log("Record ignored arriving from database:", details.db_name, " record:", details.change.id);
                }
            }
            break;

        case rule_events_database:
            {

                // track simulation and telemetry start and stop
                switch (details.change.doc.event) {
                    case SIM_START_EVENT:
                        {
                            operational_status.simulation_status = "active";
                            console.log(prefix_text, "Rule Processing - Simulation Iteration Start Event");
                        }
                        break;
                    case SIM_END_EVENT:
                        {
                            operational_status.simulation_status = "inactive";
                            // if continuous operation and both telemetry and simulation inactive, event_manager will
                            // re-initialize telemetry
                            if (operational_status.iteration == "continuous" &&
                                operational_status.telemetry_status == "inactive") 
                            
                            {
                                var dbname = "telemetry_transitions";
                                var key = "telemetry_control";
                                var state = "restart";
                                update_control(dbname, key, state);                                  
                                console.log(prefix_text, "Rule Processing - Event Manager Restarting Telemetry in Continuous Mode TBD");
                            }
                            console.log(prefix_text, "Rule Processing - Simulation Iteration Complete Event");
                        }
                        break;
                    case TEL_START_EVENT:
                        {
                            operational_status.telemetry_status = "active";
                            console.log(prefix_text, "Rule Processing - Telemetry Iteration Start Event");
                        }
                        break;
                    case TEL_END_EVENT:
                        {
                            operational_status.telemetry_status = "inactive";
                            if (operational_status.iteration == "continuous" &&
                                operational_status.simulation_status == "inactive") 
                            {
                                var dbname = "telemetry_transitions";
                                var key = "telemetry_control";
                                var state = "restart";
                                update_control(dbname, key, state);                               
                                console.log(prefix_text, "Rule Processing - Event Manager Restarting Telemetry in Continuous Mode TBD");
                            }
                            console.log(prefix_text, "Rule Processing - Telemetry Iteration Complete Event");
                        }
                        break;
                    case PATRONS_BOARD:
                        {
                            console.log(prefix_text, "Rule Processing - Olli 1 at Stop 4, Patron Boarding");
                            if (operational_status.pause_at_stops) {
                                
                                var dbname = "telemetry_transitions";
                                var key = "telemetry_control";
                                var state = "disable";
                                update_control(dbname, key, state);
                                
                                console.log(prefix_text, "Rule Processing - Pause at Stops Enabled, Olli 1 at Stop 4, Patron Can Board");
                            }

                        }
                        break;
                    case PATRONS_EXIT:
                        {
                            console.log(prefix_text, "Rule Processing - Rule Processing - Olli 1 at Stop 1, Patron Exit");
                            if (operational_status.pause_at_stops) {
                                
                                var dbname = "telemetry_transitions";
                                var key = "telemetry_control";
                                var state = "disable";
                                update_control(dbname, key, state);                                
                                console.log(prefix_text, "Rule Processing - Pause at Stops Enabled, Olli 1 at Stop 1, Patron Can Exit");
                            }

                        }
                        break;
                    default: // non special event awareness
                        console.log(prefix_text, "Rule Processing - Event Arrived[" + details.change.doc.event + "]");
                }

            }
            defauilt:
                break;
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
