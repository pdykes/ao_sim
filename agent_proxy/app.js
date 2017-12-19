/*

   Accessible Olli Telemetry Simulation Controller
    - Telemetry data
    - Simulation mode
    
    pdykes@us.ibm.com

*/

var config = require('config');

var module_name = config.get("agent_proxy.module_name");

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
var follow = require('follow');
var commandLineArgs = require('command-line-args');

// async waterfall

var async = require('async');
var waterfall = require('async-waterfall');

// setup follow for telemetry control

var prefix_text = "[" + config.get("agent_proxy.module_Name") + "]";

var proxy_list = [];
proxy_list = config.get("agent_proxy.proxy_list");

proxy_list.forEach(function (item) {
    console.log(prefix_text, "Initializing:", item.name);
    debug("item configuration entry:", JSON.stringify(item, null, 4));
    // *********************************************************************
    // create a listner for each proxy agent to forward events to the device

    // follow for each database (listening and then post to device)
    proxy_list[item.name] = [];

    proxy_list[item.name]["dblistener"] =
        config.get("global.nosql_url") + "/" + item.database /* + "/_db_updates"  */ ;

    debug("url:", proxy_list[item.name]["dblistener"]);
    proxy_list[item.name]["opts"] = {
        db: proxy_list[item.name]["dblistener"],
        since: "now",
        include_docs: "true"
    }

    debug("follow opts:", JSON.stringify(proxy_list[item.name]["opts"], null, 4));

    var feed = new follow.Feed(proxy_list[item.name]["opts"]);

    feed.on('change', function (change) {

        /* leave this in, decide later to include new...
        debug("Dump feed attributes:");
        for (var key in this) {
            debug("feed key:", key);
        }
        console.log("another approach:", Object.getOwnPropertyNames(this));
        console.log("feed.db", this.db);
        */

        follow_on_change(change, this.db);
    });

    feed.on('error', function (err) {
        follow_on_error(err);
    });

    feed.follow();

    proxy_list[item.name]["feed"] = feed;

    console.log(prefix_text, "Listener Target:", proxy_list[item.name]["dblistener"]);

    // *********************************************************************
    // create a listner for each proxy agent to forward events to the device

    var database_url = config.get("global.nosql_url");
    var database_user = config.get("global.nosql_user");
    var database_password = config.get("global.nosql_password");
    var database = item.database;
    var database_key_to_device = item.to_device;
    var database_key_from_device = item.from_device;

    var couch = null;
    var proxy_db = null;
    try {
        couch = require('nano')({
            url: database_url,
            parseUrl: false
        });
        proxy_db = couch.use(database);
    } catch (err) {
        console.log("database init failure", err);
    }

    proxy_list[item.name]["name"] = item.name;
    proxy_list[item.name]["url"] = database_url;
    proxy_list[item.name]["database"] = proxy_db;
    proxy_list[item.name]["user"] = database_user;
    proxy_list[item.name]["to_device_url"] = item.to_device_url;
    proxy_list[item.name]["instance"] = item.instance;
    proxy_list[item.name]["password"] = database_password;
    proxy_list[item.name]["database_key_to_device"] = database_key_to_device;
    proxy_list[item.name]["database_key_from_device"] = database_key_from_device;
    proxy_list[item.name]["status"] = "Uninitialized";

    debug("proxy list entry:", JSON.stringify(proxy_list[item.name]["url"], null, 4));

});

/*                
                
var listener_target = config.get("global.nosql_url") + config.get("agents.telemetry.database");

debug("Listener target:", listener_target);

var opts = {}; // Same options paramters as before
var feed = new follow.Feed(opts);

feed.db = listener_target;
feed.since = 'now';

*/


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

// load endpoint URL in which all content will be received

var end_point_url = config.get("agent_proxy.endpoint_url");

var init_template = {
    "event": "init",
    "agent_id": "tbd",
    "agent_instance": "tbd",
    "endpoint_url": end_point_url
};

var start_template = {
    "event": "start"
};

var suspend_template = {
    "event": "suspend"
};

var exit_template = {
    "event": "exit"
};

var success_template = {
    "agent": agent_name,
    "agent_version": agent_version,
    "event": "success"
};

var failure_template = {
    "agent": agent_name,
    "agent_version": agent_version,
    "state": "failure",
};

// create listening port

var parts = end_point_url.split(":");
var http_port = parts[parts.length - 1]; // get last portion of string
// var http_port = port_plus.slice(0, -1); // take off the last slash


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
            debug(prefix_text, "db perf [" + database_record._id + "]:", etime - stime, "ms");

        }); // get
    } catch (err) {
        debug("load database exception:", err);
    }
}

//---------------------------------------------------------------

function evaluate_data(req, resp, callback) {

    debug("Phase 1: Prepare proxy client");
    var incoming = null;
    var incoming = req.body;
    try {
        if (incoming.agent_id !== undefined) {
            incoming['_id'] = proxy_list[incoming.agent_id].database_key_from_device;
            debug("Message body phase 1 success:", incoming);
            callback(null, incoming, req, resp);
        } else {
            debug("Phase 1: Error, Request missing agent_id field");
            var err = new Error("Request missing agent_id field");
            callback(err);
        }
    } catch (err) {
        debug("Phase 1: Error, evaluate_data");
        callback(err);
    }

}

function obtain_asset_record(event, req, resp, callback) {

    var db_record_found = false;

    // attempt to get record from database
    debug("Phase 2: DB Query, asset:", JSON.stringify(event,null,4));

    try {
        proxy_list[event.agent_id].database.get(event._id, {
            revs_info: false
        }, function (err, event_body) {
            if (!err) {
                db_record_found = true;
                if (db_record_found) {
                    debug("Phase 2:Database record found:", JSON.stringify(event_body, 4, null));
                    event['_rev'] = event_body._rev;
                } else {
                    debug("Phase 2: Database record found for", event._id);
                }
                debug("Phase 2: Attempting to store:", JSON.stringify(event, 4, null));
                callback(null, event, req, resp);
            } else {
                debug("Phase 2: Database record not found for", event.agent_id);
                callback(null, event, req, resp);
            }
        });
    } catch (err) {
        debug("Phase 2: Database record not found for", event.agent_id);
        callback(err, "Phase 2: failure", err);
    }
}


function update_asset_record(event_body, req, resp, callback) {

    debug("Phase 3: Database update to " + event_body.agent_id);

    /*
    if (event_body.hasOwnProperty('_rev')) {
        delete event_body._rev
    }
    */

    try {
        proxy_list[event_body.agent_id].database.insert(event_body, function (err, body) {
            if (!err) {
                if (event_body.hasOwnProperty('_rev')) {
                    console.log("Phase 3: Database asset updated:", event_body._id);
                } else {
                    console.log("Phase 3: Database asset created:", event_body._id);
                }
                callback(null, event_body, req, resp);
            } else {
                console.log("Phase 3: Database asset " + event_body.agent_id + " throwing: ", err);
                callback(err, event_body, req, resp);
            }
        }); // insert
    } catch (err) {
        debug("Phase 3: Database record not found for", event_body.agent_id);
        callback(err, "Phase 3: failure", err);
    }
}

function asset_request_complete(body, req, resp, callback) {
    try {
        debug("Phase 4: Database update complete for", body.agent_id);
        var outgoing_response = success_template;
        resp.status(200).send(JSON.stringify(outgoing_response, null, 4));
        callback(null, body, req, resp, callback);
    } catch (err) {
        debug("Phase 4: Database record not found for", body.agent_id);
        callback(err, "Phase 4: failure", err);
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

function submit_message_to_agent_proxy(json_message, device_instance) {

    debug("message to send:", json_message);

    var options = {
        uri: proxy_list[device_instance].to_device_url,
        method: 'POST',
        json: json_message
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log("Message submitted successfully:", JSON.stringify(json_message, null, 4));
        } else {
            console.log("Agent Initialization Error for " + device_instance + ":", error);

        }
    });

}

function follow_on_change(change, database) {

    // catch the to_device items, and then propogate to the appropriate URL

    console.log(prefix_text, "Change detected: ", JSON.stringify(change, null, 4));

    // debug("database:", this.toString());

    var parts = database.split("/");
    var dbname = parts[parts.length - 1];
    console.log(prefix_text, "Full database url: ", database);
    console.log(prefix_text, "Database name: ", dbname);
    
    var device_name_parts = dbname.split("_");
    var device_id = device_name_parts[0] + "_" + device_name_parts[1];
    
    debug("device instance id:", device_id);

    debug("proxy http value:", proxy_list[device_id].to_device_url);

    delete change.doc._rev; // cause database update conflicts
    if (change.doc._id == proxy_list[device_id].database_key_to_device) {
        console.log(prefix_text, "Submitting to_device event to:", proxy_list[device_id].to_device_url);
        submit_message_to_agent_proxy(change.doc, device_id);
    }


    /*
    
            console.log(prefix_text,"Retrieving updated record from:", listener_target);
            request(listener_target + "/" + change.id, function (error, response, body) {
                if (error != null) {
                    console.log(prefix_text, 'error:', error); // Print the error if one occurred
                }
                console.log(prefix_text, 'statusCode:', response && response.statusCode); // Print the response status 
                var json_body = JSON.parse(body);
                console.log(prefix_text, 'body:', JSON.stringify(json_body, null, 4)); // Print the object


                // update the database

                // to start - simple wins:
                // simple rule: if was in, am out, bottom line (case hitting rfid twice)
                //              if was not in, and entry, am in (if odd, e.g. always in)
                if (json_body._id == telemetry_control) {
                    console.log(prefix_text, "Control mode that arrived:", json_body.mode);
                    switch (json_body.mode) {
                        case "enabled":
                            {
                                console.log(prefix_text, "Control Mode", json_body.mode);
                                establish_simluation_start();
                                // control value
                            }
                            break;
                        case "disabled":
                            {
                                console.log(prefix_text, "Control Mode", json_body.mode);
                                suspend_simluation();
                                // control value
                            }
                            break;
                        default:
                            {
                                console.log(prefix_text, "Unknown Control Mode", json_body.mode);
                            }
                            break;
                    }
                }

            });
    
            */

}

//});

// feed.on('error', function (er) {

function follow_on_error(er) {

    console.error('Since Follow always retries on errors, this must be serious', er);
    // throw er;

}
// });

// feed.follow();


console.log(prefix_text, "Agent listening on http port:", http_port);
app.listen(http_port);

// ready for interaction, initialize all registered agents...
// assumption all registered agents will be contacted

// this kick start the agents operations

proxy_list.forEach(function (item) {

    var init_message = init_template;
    init_message.agent_id = item.name;
    init_message.agent_instance = proxy_list[item.name].instance;

    debug("init message:", init_message);

    var options = {
        uri: proxy_list[item.name].to_device_url,
        method: 'POST',
        json: init_message
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var found = false;
            var success = false;
            var item_found = null;
            proxy_list.forEach(function (item) {
                if ((found != true) &&
                    (body.agent_id !== undefined) &&
                    (body.agent_id == item.name)) {
                    found = true;
                    item_found = item;
                    if ((item_found != true) &&
                        (body.payload.result !== undefined) &&
                        (body.payload.result == "success")) {
                        success = true;
                        console.log(prefix_text, "Successful incoming agent init response:", item.name);
                        proxy_list[item.name]["status"] = "Initialized";
                    }
                }
            });
        } else {
            proxy_list[item.name]["status"] = "Initialization Error";
            console.log("Agent Initialization Error for " + item.name + ":", error);
            var message = failure_template;
            message.response = "Failed agent initialization for " + item.name;
        }
    });
});

// web server function

app.post('/', function (request, response) {
    debug("********************** Recieve Post Message *****************************");
    debug(prefix_text, "Incoming Device Request:", JSON.stringify(request.body, null, 4)); // your JSON
    var incoming = request.body;


    /*
    
            try {
                incoming['_id'] = proxy_list[incoming.agent_id].database_key_from_device;
                db_update(proxy_list[incoming.agent_id].database, incoming, function () {
                    console.log(prefix_text, "Database update for database " + incoming.agent_id +
                        "record", incoming._id, "successful, contents:", JSON.stringify(incoming));
                    var outgoing_response = success_template;
                    response.status(200).send(JSON.stringify(outgoing_response, null, 4));
                });
            } catch (err) {
                var outgoing_response = failure_template;
                response.status(500).send(JSON.stringify(outgoing_response, null, 4));
                console.log(prefix_text, "Error on database write for this message:", JSON.stringify(incoming, null, 4));
                console.log(prefix_text, "Error on database write:", err);
            }
    
            */
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
