/*

    Accessible Olli Command line tool
    
    
    functions
      - monitor any event feed from couchdb
      - update database to enable some sort of action

    author: pdykes@us.ibm.com

*/

var net = require('net');
var fs = require('fs');
var config = require('config');
var follow = require('follow');

// async waterfall

var async = require('async');
var waterfall = require('async-waterfall');

var commandLineArgs = require('command-line-args');

// var module_name = "telemetry";
var module_name = config.get("ao_cli.module_name");
var module_Name = config.get("ao_cli.module_Name");
var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

var text_prefix = "[" + module_Name + "]";

var default_follow = "telemetry";
var default_control = "control";
var default_operation = "operation";

var command_type = null;

var follow_function = false;
var control_function = false;
var operation_function = false;

var action_value = null;
var control_value = null;
var operation_value = null;

var svc_control = process.env.AOCLI_SERVICE;
var so_service = false;
if (svc_control == "true") so_service = true;


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
        name: 'follow',
        type: String,
        multiple: false,
        alias: 'f'
    },
    {
        name: 'control',
        type: String,
        multiple: false,
        alias: 'c'
    },
    {
        name: 'operation',
        type: String,
        multiple: false,
        alias: 'o'
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

if (cli_options.follow !== undefined) {
    debug("cli_options.follow:", cli_options.follow);
    action_value = cli_options.follow;
    command_type = "follow";
    debug("command_type:", command_type);
    debug("action_value:", action_value);
}

if (cli_options.control !== undefined) {
    debug("cli_options.follow:", cli_options.control);
    control_value = cli_options.control;
    command_type = "control";
    control = cli_options.control;
    debug("command_type:", command_type);
    debug("control_value:", control_value);
}


if (cli_options.operation !== undefined) {
    debug("cli_options.operation:", cli_options.operation);
    operation_value = cli_options.operation;
    debug("operation_value:", operation_value);
}

var database_url = null;
var feed = null;
var database_name = null;
var database_key = null;
var control_record = null;


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

    if ((control == "telemetry_transitions") && (operation == "disable")) {
        control_command = "disabled";
        control_event = {
            _id: database_key
        };
    }



    if ((control == "kintrans_01_transitions") && (operation == "init")) {
        control_command = "init";
        control_event = {
            _id: database_key,
            "agent_id": "kintrans_01",
            "agent_version": "0.0.1",
            "event": "init",
            "payload": {}
        };
    }

    if ((control == "kintrans_01_transitions") && (operation == "start")) {
        control_command = "start";
        control_event = {
            _id: database_key,
            "agent_id": "kintrans_01",
            "agent_version": "0.0.1",
            "event": "start",
            "payload": {}
        };
    }

    if ((control == "kintrans_01_transitions") && (operation == "suspend")) {
        control_command = "suspend";
        control_event = {
            _id: database_key,
            "agent_id": "kintrans_01",
            "agent_version": "0.0.1",
            "event": "suspend",
            "payload": {}
        };
    }

    if ((control == "kintrans_01_transitions") && (operation == "exit")) {
        control_command = "exit";
        control_event = {
            _id: database_key,
            "agent_id": "kintrans_01",
            "agent_version": "0.0.1",
            "event": "exit",
            "payload": {}
        };
    }

    if ((control == "kintrans_02_transitions") && (operation == "init")) {
        control_command = "init";
        control_event = {
            _id: database_key,
            "agent_id": "kintrans_02",
            "agent_version": "0.0.1",
            "event": "init",
            "payload": {}
        };
    }

    if ((control == "kintrans_02_transitions") && (operation == "start")) {
        control_command = "start";
        control_event = {
            _id: database_key,
            "agent_id": "kintrans_02",
            "agent_version": "0.0.1",
            "event": "start",
            "payload": {}
        };
    }

    if ((control == "kintrans_02_transitions") && (operation == "suspend")) {
        control_command = "suspend";
        control_event = {
            _id: database_key,
            "agent_id": "kintrans_02",
            "agent_version": "0.0.1",
            "event": "suspend",
            "payload": {}
        };
    }

    if ((control == "kintrans_02_transitions") && (operation == "exit")) {
        control_command = "exit";
        control_event = {
            _id: database_key,
            "agent_id": "kintrans_02",
            "agent_version": "0.0.1",
            "event": "exit",
            "payload": {}
        };
    }

    if ((control == "ultrahaptics_01_transitions") && (operation == "init")) {
        control_command = "init";
        control_event = {
            _id: database_key,
            "agent_id": "ultrahaptics_01",
            "agent_version": "0.0.1",
            "event": "init",
            "payload": {}
        };
    }

    if ((control == "ultrahaptics_01_transitions") && (operation == "start")) {
        control_command = "start";
        control_event = {
            _id: database_key,
            "agent_id": "ultrahaptics_01",
            "agent_version": "0.0.1",
            "event": "start",
            "payload": {}
        };
    }

    if ((control == "ultrahaptics_01_transitions") && (operation == "suspend")) {
        control_command = "suspend";
        control_event = {
            _id: database_key,
            "agent_id": "ultrahaptics_01",
            "agent_version": "0.0.1",
            "event": "suspend",
            "payload": {}
        };
    }

    if ((control == "ultrahaptics_01_transitions") && (operation == "exit")) {
        control_command = "exit";
        control_event = {
            _id: database_key,
            "agent_id": "ultrahaptics_01",
            "agent_version": "0.0.1",
            "event": "exit",
            "payload": {}
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
                debug("Phase 2: Attempting to store:", JSON.stringify(control_event, 4, null));
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

// PJD need to use the to_device record

//---------------------------------------------------------------


switch (command_type) {
    case "follow":
        debug("action=>follow");
        switch (action_value) {
            case "telemetry":
                debug("database=>telemetry");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url") +
                        "/" +
                        config.get("agents.telemetry.database");

                    debug(text_prefix, "Follow listener:", database_url);

                    var opts = {
                        db: database_url,
                        since: 'now',
                        include_docs: 'true'
                    };

                    feed = new follow.Feed(opts);
                    follow_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;
            case "patron_locations":
                debug("database=>patrons");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url") +
                        "/" +
                        config.get("agents.patron_manager.output_database");

                    debug(text_prefix, "Follow listener:", database_url);

                    var opts = {
                        db: database_url,
                        since: 'now',
                        include_docs: 'true'
                    };

                    feed = new follow.Feed(opts);
                    follow_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;
            case "events":
                debug("database=>ao_events");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url") +
                        "/" +
                        config.get("agents.event_agent.database");

                    debug(text_prefix, "Follow listener:", database_url);

                    var opts = {
                        db: database_url,
                        since: 'now',
                        include_docs: 'true'
                    };

                    feed = new follow.Feed(opts);
                    follow_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;

            case "patrons":
                debug("database=>persona_transitions");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url") +
                        "/" +
                        config.get("agents.monitor.database");

                    debug(text_prefix, "Follow listener:", database_url);

                    var opts = {
                        db: database_url,
                        since: 'now',
                        include_docs: 'true'
                    };

                    feed = new follow.Feed(opts);
                    follow_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;

            case "ultrahaptics_01":
                debug("database=>ultrahaptics_01");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url") +
                        "/" +
                        "ultrahaptics_01_transitions";

                    debug(text_prefix, "Follow listener:", database_url);

                    var opts = {
                        db: database_url,
                        since: 'now',
                        include_docs: 'true'
                    };

                    feed = new follow.Feed(opts);
                    follow_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;
            case "kintrans_01":
                debug("database=>kintrans_01");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url") +
                        "/" +
                        "kintrans_01_transitions";

                    debug(text_prefix, "Follow listener:", database_url);

                    var opts = {
                        db: database_url,
                        since: 'now',
                        include_docs: 'true'
                    };

                    feed = new follow.Feed(opts);
                    follow_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;
            case "kintrans_02":
                debug("database=>kintrans_02");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url") +
                        "/" +
                        "kintrans_02_transitions";

                    debug(text_prefix, "Follow listener:", database_url);

                    var opts = {
                        db: database_url,
                        since: 'now',
                        include_docs: 'true'
                    };

                    feed = new follow.Feed(opts);
                    follow_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }
                break;
            case "voice_requests":
                debug("database=>voice_requests");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url") +
                        "/" +
                        config.get("voice_requests");

                    debug(text_prefix, "Follow listener:", database_url);

                    var opts = {
                        db: database_url,
                        since: 'now',
                        include_docs: 'true'
                    };

                    feed = new follow.Feed(opts);
                    follow_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }
                break;

            case "lights_requests":
                debug("database=>lights_requests");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url") +
                        "/" +
                        config.get("lights_requests");

                    debug(text_prefix, "Follow listener:", database_url);

                    var opts = {
                        db: database_url,
                        since: 'now',
                        include_docs: 'true'
                    };

                    feed = new follow.Feed(opts);
                    follow_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }
                break;

            default:
                console.log(text_prefix, "Unkown follow target, see configuration");
        }

        break;

    case "control":
        debug("action=>control");
        switch (control_value) {
            case "telemetry":
                debug("database=>telemetry");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url");

                    debug(text_prefix, "Control Database:", database_url);

                    database_key =
                        config.get("ao_cli.telemetry_control");

                    debug(text_prefix, "Control Database Key:", database_key);

                    database_name = config.get("ao_cli.telemetry");

                    debug(text_prefix, "Database Name:", database_name)

                    control_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;

            case "kintrans_01":
                debug("database=>kintrans_01");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url");

                    debug(text_prefix, "Control Database:", database_url);

                    database_key =
                        config.get("ao_cli.kintrans_01_to_device");

                    debug(text_prefix, "Control Database Key:", database_key);

                    database_name = config.get("ao_cli.kintrans_01");

                    debug(text_prefix, "Database Name:", database_name)

                    control_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;

            case "kintrans_02":
                debug("database=>kintrans_02");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url");

                    debug(text_prefix, "Control Database:", database_url);

                    database_key =
                        config.get("ao_cli.kintrans_02_to_device");

                    debug(text_prefix, "Control Database Key:", database_key);

                    database_name = config.get("ao_cli.kintrans_02");

                    debug(text_prefix, "Database Name:", database_name)

                    control_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;

            case "ultrahaptics_01":
                debug("database=>ultrahaptics_01");
                try {
                    database_url =
                        config.get("ao_cli.nosql_url");

                    debug(text_prefix, "Control Database:", database_url);

                    database_key =
                        config.get("ao_cli.ultrahaptics_01_to_device");

                    debug(text_prefix, "Control Database Key:", database_key);

                    database_name = config.get("ao_cli.ultrahaptics_01");

                    debug(text_prefix, "Database Name:", database_name)

                    control_function = true;
                } catch (error) {
                    console.log(text_prefix, "Error establishing follow:", error.message);
                }

                break;

            default:
                console.log(text_prefix, "Unknown control target, see configuration");
        }

        break;

    default:
        if (so_service) {
            console.log(text_prefix, "Initialing web control vs. cli");
        } else {
            console.log(text_prefix, "Unknown action, refer to docs");
        }
}

debug("Process the action");

// actions work

if (follow_function) {
    debug("follow handler");

    console.log(text_prefix, "Action: " + action_value + " Target: " + database_url);

    feed.on('error', function (er) {
        console.error(text_prefix, 'Since Follow always retries on errors, this must be serious', er);
        // throw er;
    });

    feed.on('change', function (change) {
        console.log(text_prefix, "Event change detected for " + feed.db + ": ", JSON.stringify(change, null, 4));
    });

    feed.follow();

    console.log(text_prefix, "Ctrl-C to exit in follow mode");
}


if (control_function) {
    debug("control handler");

    var db = null;

    try {
        debug("Control Database  uri:" +
            database_url +
            " database name:" +
            database_name);

        couch = require('nano')({
            url: database_url,
            parseUrl: false
        });
        db = couch.use(database_name);
    } catch (err) {
        console.log("database init failure", err);
    }

    try {
        debug(text_prefix, "Database operation starting");

        debug("waterfall attributes:", database_key, database_name, operation_value);

        waterfall([
            async.apply(evaluate_data,
                    db,
                    database_key,
                    database_name,
                    operation_value),
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
        console.log(text_prefix, "Successful operation set " +
            database_key +
            " in database " +
            database_name +
            " now set to " +
            operation_value + " state");
    } catch (err) {
        debug(text_prefix, "Error on database write:", err);

    }

}



process.on('SIGINT', function () {
    console.log(text_prefix, "Caught interrupt signal");

    process.exit();

});


//-------------------------------------------------------------------------------


/*

mvp4 - Web Processing Element - Handle web requests...


Control Function

- Simulation start/restart
   - Drive an event to "start" sim
- Simulation loop
   - Add new Simulation event at 640 offset
   - Listen for the event at 640 offset and drive an event to "start" sim
- Simulation suspend
   - Simulation submit event

- Persona
   - Attach new data to persona record (phone, food and calendar)
   - Move a persona/instance to olli stop, exhibit, olli roller 1, roller 2

- Test
   - Ramp use case
   - Emergency stop use case
   


*/

var svc_control = process.env.AOCLI_SERVICE;
var so_service = false;
if (svc_control == "true") so_service = true;

var app_port = config.get("ao_cli.app_port");

var express = null;
var app = null;
var bodyParser = null;
var path = null;

if (so_service) {
    debug("ao_cli web listener enabled");

    //require the express nodejs module
    express = require('express'),
        //set an instance of exress
        app = express(),
        //require the body-parser nodejs module
        bodyParser = require('body-parser'),
        //require the path nodejs module
        path = require("path");

    //support parsing of application/json type post data
    app.use(bodyParser.json());

    //support parsing of application/x-www-form-urlencoded post data
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    //tell express that www is the root of our public web folder
    app.use(express.static(path.join(__dirname, 'public')));

    //tell express what to do when the /form route is requested
    app.post('/action', function (req, res) {
        debug("Post entry");
        res.setHeader('Content-Type', 'application/json');

        //mimic a slow network connection
        setTimeout(function () {

            res.send(JSON.stringify({
                simmode: req.body.request_type || null,
                simcontrol: req.body.option || null,
                firstname: req.body.firstname || null,
                id: req.body.id || null,
                location: req.body.location || null,
                lastname: req.body.lastname || null
            }));

        }, 1000)

        console.log("Request type:", req.body.request_type);

        switch (req.body.request_type) {
            case "simulation":
                {
                    console.log('Simulation use case, you posted: option :' + req.body.option);
                }
                break;
            case "persona":
                {
                    //debugging output for the terminal
                    console.log('Persona use case, you posted: First Name: ' + req.body.firstname + ' Id: ' + req.body.id + ' Location: ' + req.body.location);
                }
                break;

            case "agent":
                {
                    console.log('Agent use case, you posted: option :' + req.body.option);
                }
                break;
            case "exit":
                {
                    console.log('Exit use case, you posted: option :' + req.body.option);
                }
                break;
            case "emergency_stop":
                {
                    console.log('Emergency stop use case, you posted: option :' + req.body.option);
                }
                break;
            case "wheelchair_ingress":
                {
                    console.log('Wheel chair ingress use case, you posted: option :' + req.body.option);
                }
                break;
            case "wheelchair_egress":
                {
                    console.log('Wheel chair egress use case, you posted: option :' + req.body.option);
                }
                break;
            default:
                {
                    res.send(JSON.stringify({
                        request: "unknown" || null,
                        action: "resubmit" || null
                    }));
                }
        }

    });

    //wait for a connection
    app.listen(app_port, function () {
        console.log('Server is running. Point your browser to: http://localhost:' + app_port);
    });

}
