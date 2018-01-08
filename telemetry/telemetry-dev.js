/*

   Accessible Olli Telemetry Simulation Controller
    - Telemetry data
    - Simulation mode
    
    pdykes@us.ibm.com

*/

var net = require('net');
var fs = require('fs');
var async = require('async');
var config = require('config');
var request = require('request');
var follow = require('follow');

// async waterfall

var async = require('async');
var waterfall = require('async-waterfall');

// var module_name = "telemetry";
var module_name = config.get("agents.telemetry.module_name");

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

var loadJsonFile = require('load-json-file');

// setup follow for telemetry control

var listener_target = config.get("global.nosql_url") + "/" + config.get("agents.telemetry.database");

debug("Listener target:", listener_target);

var opts = {
    db: listener_target,
    since: "now",
    include_docs: "true"
};

var feed = new follow.Feed(opts);

// process command line args
var commandLineArgs = require('command-line-args');

var text_prefix = "[" + config.get("agents.telemetry.module_Name") + "]";

console.log(text_prefix, "Initialization...");

var telemetry_filename = config.get("agents.telemetry.configuration");
var telemetry_db = null;

var suspend_simulation_thread = false;
var simulation_counter = 0;
var simulation_interval_object = null;
var simulation_start_time = 0;
var simulation_location = [];
var sim_interval = config.get("agents.telemetry.simulation_interval");
var alert_interval = config.get("agents.telemetry.alert_interval");

var database_url = config.get("global.nosql_url");
var database_user = config.get("global.nosql_user");
var database_password = config.get("global.nosql_password");
var database = config.get("agents.telemetry.database");
var telemetry_transition_key = config.get("agents.telemetry.transition");

var in_progress = false;

// used to enable and disable telemetry flow
var telemetry_control_key = config.get("agents.telemetry.control");

var couch = null;

try {
    couch = require('nano')({
        url: database_url,
        parseUrl: false
    });
    telemetry_db = couch.use(database);
} catch (err) {
    console.log("database init failure", err);
}


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
    },
    {
        name: 'interval',
        type: String,
        multiple: false,
        alias: 'n',
        defaultValue: sim_interval
    },
    {
        name: 'telemetry',
        type: String,
        multiple: false,
        alias: 'e',
        defaultValue: telemetry_filename
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

if (cli_options.telemetry !== null) {
    debug("cli_options.telemetry:", cli_options.telemetry);
    telemetry_filename = cli_options.telemetry;
}


if (cli_options.interval !== null) {
    debug("cli_options.interval:", cli_options.interval);
    sim_interval = cli_options.interval;
}

var telemetry = [];

try {
    var contents = fs.readFileSync(telemetry_filename);
    var jsonContent = JSON.parse(contents);
    debug(text_prefix, "Loaded telemetry data");
    debug(text_prefix, "Data verification: ", JSON.stringify(jsonContent, null, 4));
    telemetry = jsonContent.telemetry;
    console.log(text_prefix, "Route Description:", jsonContent.route);
} catch (err) {
    console.log(text_prefix, "Error loading telemetry data", err.message);
    console.log(text_prefix, "Error:", err);
}

// Database operations code

//---------------------------------------------------------------

function evaluate_data(tel_db, e_data, callback) {

    try {
        debug("Phase 1: Prepare control operation");

        callback(null, tel_db, e_data);
    } catch (err) {
        debug("Phase 1: Error, evaluate_data");
        callback(err);
    }

}

function obtain_asset_record(tel_db, e_data, callback) {

    var db_record_found = false;

    // attempt to get record from database
    debug("Phase 2: DB Query, asset");

    try {
        tel_db.get(e_data._id, {
            revs_info: false
        }, function (err, event_body) {
            if (!err) {
                db_record_found = true;
                if (db_record_found) {
                    debug("Phase 2:Database record found:", JSON.stringify(e_data, 4, null));
                    e_data['_rev'] = event_body._rev;
                } else {
                    debug("Phase 2: Database record found for", e_data._id);
                }
                debug("Phase 2: Attempting to store:", JSON.stringify(e_data, 4, null));
                callback(null, tel_db, e_data);
            } else {
                debug("Phase 2: Database record not found for", e_data._id);
                callback(null, tel_db, e_data);
            }
        });
    } catch (err) {
        debug("Phase 2: Database record not found for", e_data._id);
        callback(err, "Phase 2: failure", err);
    }
}


function update_asset_record(tel_db, e_data, callback) {

    debug("Phase 3: Database update");

    try {
        tel_db.insert(e_data, function (err, body) {
            if (!err) {
                if (body.hasOwnProperty('_rev')) {
                    debug("Phase 3: Database asset updated:", e_data._id);
                } else {
                    debug("Phase 3: Database asset created:", e_data._id);
                }
                callback(null, tel_db, e_data);
            } else {
                debug("Phase 3: Database asset " + e_data._id + " throwing: ", err);
                callback(err, tel_db, e_data);
            }
        }); // insert
    } catch (err) {
        debug("Phase 3: Database record not found for", e_data._id);
        callback(err, "Phase 3: failure", err);
    }
}

function asset_request_complete(tel_db, e_data, callback) {
    try {
        debug("Phase 4: Database update complete for", e_data._id);
        callback(null, tel_db, e_data);
    } catch (err) {
        debug("Phase 4: Database record not found for", e_data._id);
        callback(err, "Phase 4: failure", err);
    }
}

// PJD need to use the to_device record

//---------------------------------------------------------------

function db_update(dbase, database_record) {
    var stime = 0;
    var etime = 0;

    var date = new Date();
    stime = date.getTime();

    try {
        dbase.get(database_record._id, {
            revs_info: false
        }, function (err, dbbody) {
            debug("****Working on this asset in db get:", database_record._id, "*****");
            var db_record_found = false;
            if (!err) {
                db_record_found = true;
                debug("Database record found:", JSON.stringify(dbbody, 4, null));
                debug("Database record found, key:", database_record._id);
            } else {
                debug("Database record not found for:", database_record._id);
            }

            // note always overwriting here...
            if (database_record.hasOwnProperty('_revs_info')) {
                delete database_record['_revs_info']; // remove before use as a base
            }

            if (db_record_found) {
                database_record['_rev'] = dbbody._rev;
            }

            dbase.insert(database_record, function (err, body) {
                if (!err) {
                    if (database_record.hasOwnProperty('_rev')) {
                        debug("Database asset updated:", database_record._id);
                    } else {
                        debug("Database asset created:", database_record._id);
                    }
                    debug("Persist action complete:", JSON.stringify(database_record, 4, null));
                } else {
                    debug("Database asset insert error, throwing: ", err);
                }
            }); // insert


            var date = new Date();
            etime = date.getTime();
            debug(text_prefix, "db perf [" + database_record._id + "]:", etime - stime, "ms");

        }); // get
    } catch (err) {
        debug("load database exception:", err);
    }
}


function simulation_next_events() {

    // loop based on the former tracking data

    debug(text_prefix, "****Establish the simulation events");

    if (suspend_simulation_thread == true) {
        suspend_simluation();
        console.log(text_prefix, "Simulation Suspended");
        return;
    }

    date = new Date();
    time_ms = date.getTime();

    console.log("Telemetry count: " + telemetry.length);
     console.log("Simulation Counter:", simulation_counter, 
        "\nDelta Time:", telemetry[simulation_counter].delta_time, 
        "\nStart Time:", simulation_start_time, 
        "\nCurrent Time:", time_ms, 
        "\nTime Diff: ", (time_ms - (telemetry[simulation_counter].delta_time+simulation_start_time)));

    while ((simulation_counter < telemetry.length) && (telemetry[simulation_counter].delta_time + simulation_start_time <= time_ms)) {

        try {
            debug("Simulation Counter:", simulation_counter);
            debug("Current Time:", time_ms);
            debug("Simulated Event Time Delta:", telemetry[simulation_counter].delta_time);
            debug("Simulated Event Time:", telemetry[simulation_counter].delta_time + simulation_start_time);
            var event_data = {
                _id: telemetry_transition_key,
                event_time: time_ms,
                delta_time: telemetry[simulation_counter].delta_time,
                transport_data: telemetry[simulation_counter]
            };
            debug("Simulation Event data:", JSON.stringify(event_data));

            waterfall([
                async.apply(evaluate_data, telemetry_db, event_data),
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

            /* db_update(telemetry_db, event_data); */
            simulation_counter++;
        } catch (error) {
            console.log(text_prefix,
                "Simulation issue, slot :" + simulation_counter +
                " failure ",
                error);
        }
    }
    if (simulation_counter >= telemetry.length) {
        console.log(text_prefix, "Simulation Mode Complete")
        in_progress = false;
        suspend_simluation();
    }
}

function establish_simluation_start( /* callback */ ) {

    if (!in_progress) { // beginning of new run

        debug(text_prefix, "****Establish the simulation time");
        var date = new Date();
        simulation_counter = 0;
        simulation_start_time = date.getTime(); // establish time start in milliseconds
        console.log(text_prefix, 'Simulation start time established');
        simulate_telemetry();
        console.log(text_prefix, 'Simulation start request initiated');
        in_progress = true;

    } else { // continue an existing run

        // continue a suspended run

        suspend_simulation_thread = false;
        simulate_telemetry();

        console.log(text_prefix, 'Simulation restart request complete');

    }

}

function establish_simulation_start_position( positionOffset ) {
    clearInterval(simulation_interval_object);

    simulation_counter = positionOffset;
    suspend_simulation_thread = false;

    //keep counter between 0 and telemetry.length-1
    simulation_counter = Math.min(telemetry.length-1, Math.max(0, simulation_counter));
    
    //relative start time from counter
    if( simulation_counter <= 5 ) 
        simulation_start_time = (new Date()).getTime() - ((simulation_counter)*alert_interval); // establish time start in milliseconds
    else
        simulation_start_time = (new Date()).getTime() - ((simulation_counter+1)*alert_interval); // establish time start in milliseconds

    debug(text_prefix, "****Establish the simulation time");
    console.log(text_prefix, 'Simulation start time established');
    simulation_next_events();
    console.log(text_prefix, 'Simulation start request initiated');
    in_progress = true;
}

function establish_simulation_start_offset( step ) {
    
    clearInterval(simulation_interval_object);

    simulation_counter += step;
    suspend_simulation_thread = false;

    //keep counter between 0 and telemetry.length-1
    simulation_counter = Math.min(telemetry.length-1, Math.max(0, simulation_counter));
    
    //relative start time from counter
    if( simulation_counter <= 5 ) 
        simulation_start_time = (new Date()).getTime() - ((simulation_counter)*alert_interval); // establish time start in milliseconds
    else
        simulation_start_time = (new Date()).getTime() - ((simulation_counter+1)*alert_interval); // establish time start in milliseconds

    debug(text_prefix, "****Establish the simulation time");
    console.log(text_prefix, 'Simulation start time established');
    simulation_next_events();
    console.log(text_prefix, 'Simulation start request initiated');
    in_progress = true;
}

function suspend_simluation() {

    if (in_progress) {
        console.log(text_prefix, "Suspending in progress simulation, renable to start");
    } else {
        console.log(text_prefix, "Simulation is completed, awaiting next restart");
    }

    in_progress = false;
    if (simulation_interval_object != null) {
        clearInterval(simulation_interval_object);
        simulation_interval_object = null;
    }
}

process.on('SIGINT', function () {
    console.log(text_prefix, "Caught interrupt signal");

    if (simulation_interval_object != null) {
        clearInterval(simulation_interval_object);
        simulation_interval_object = null;
    }
    in_progress = false;
    process.exit();

});

console.log(text_prefix, "Monitoring specific events can be enable via ao_cli or by enabling debug");

function simulate_telemetry( /* callback */ ) {

    debug("Entering simulate telemetry...");
    if (simulation_interval_object == null) {
        console.log(text_prefix, "Simulation start request");
        simulation_interval_object = setInterval(simulation_next_events, alert_interval);
        debug("alert interval", alert_interval);
    } else {
        console.log(text_prefix, "Simulation request ignored, already active");
    }
}

feed.on('change', function (change) {

    console.log(text_prefix, "Receiving updated record from:", listener_target);

    debug("Change detected: ", JSON.stringify(change, null, 4));


    if (change.doc._id == telemetry_control_key) {
        console.log(text_prefix, "Control mode change request arrived:", change.doc.mode);
        switch (change.doc.mode) {
            case "step_forward":
                {
                    console.log(text_prefix, "Control Mode", change.doc.mode);
                    console.log("STEPPING FORWARD");
                    
                        establish_simulation_start_offset(0);
                    // control value
                }
                break;
            case "step_backward":
                {
                    console.log(text_prefix, "Control Mode", change.doc.mode);
                    console.log("STEPPING BACK");
                    establish_simulation_start_offset(-2);
                    // control value
                }
                break;
            case "enabled":
                {
                    console.log(text_prefix, "Control Mode", change.doc.mode);
                    establish_simluation_start();
                    // control value
                }
                break;
            case "disabled":
                {
                    console.log(text_prefix, "Control Mode", change.doc.mode);
                    suspend_simulation_thread = true;
                    suspend_simluation();
                }
                break;
            default:
                {
                    if(change.doc.mode.indexOf("stepforward_") > -1) {
                        var stepParts = change.doc.mode.split("_");
                        var count = parseInt(stepParts[1]) - 1;
                        establish_simulation_start_offset(count);
                    } else if(change.doc.mode.indexOf("stepbackward_") > -1) {
                        var stepParts = change.doc.mode.split("_");
                        var count = parseInt(stepParts[1]) + 1;
                        establish_simulation_start_offset(-count);
                    } else if(change.doc.mode.indexOf("goto_") > -1) {
                        var stepParts = change.doc.mode.split("_");
                        var count = parseInt(stepParts[1]) + 1;
                        establish_simulation_start_position(count);
                    } else {
                        console.log(text_prefix, "Unknown Control Mode", json_body.mode);
                    }
                    
                }
                break;
        }
    }

    if (change.doc._id == telemetry_transition_key) {
        console.log(text_prefix, "Transport transition Delta Time: " + change.doc.delta_time);
    }

});

feed.on('error', function (er) {
    console.error(text_prefix, 'Error monitoring the replication flow:', er);
    // throw er;
});

feed.follow();
