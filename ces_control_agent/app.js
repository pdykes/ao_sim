/* 

   PJD Dykes
   #AccessibleOlli
   mvp4
   
   ces_control agent
*/

var config = require("config");

var module_name = config.get("agents.ces_control_agent.module_name");

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

var prefix_text = "[" + config.get("agents.ces_control_agent.module_Name") + "]";

var listener_target = config.get("global.nosql_url") +
    "/" +
    config.get("agents.event_manager.events_database");

console.log("Listener target:", listener_target, "^c to exit");

var telemetry_database_url =
    config.get("ao_cli.nosql_url") +
    "/" +
    config.get("agents.telemetry.database");

var database = config.get("ao_cli.nosql_url");
var database_name = config.get("agents.telemetry.database");

var database_control_db = null;

var telemetry_database_key =
    config.get("ao_cli.telemetry_control");

var database_user = config.get("global.nosql_user");
var database_password = config.get("global.nosql_password");

var request = require('request');
var follow = require('follow');

var opts = {
    db: listener_target,
    since: 'now',
    include_docs: true
}; // Same options paramters as before
var feed = new follow.Feed(opts);

// async waterfall

var async = require('async');
var waterfall = require('async-waterfall');

/* database management

Three databases
  - patron_registration
  - patron_roller
  - patron_stop
  
*/

var couch = null;

var database_interacation = true;

if (database_interaction = true) {
    try {
        // patron_locations setup
        couch = require('nano')({
            url: database,
            parseUrl: false
        });
        database_control_db = couch.use(database_name);
    } catch (err) {
        console.log("database init failure", err);
    }
}

// ---------------------------------------------------

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
    debug("Phase 2: DB Query, asset:", JSON.stringify(event, null, 4));

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

/*

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
    
*/


// ---------------------------------------------------

feed.on('change', function (change) {
    // console.log('Doc ' + '/' + change.id + ' in change ' + change.seq + ' is neither stinky nor ugly.');
    // console.log("Change detected: ", JSON.stringify(change, null, 4));

    if (change.doc.payload._event_type === "simulation_rule_event") {
        console.log(prefix_text, "Simulation Event:", change.doc.event, "Sim Time:", change.doc.payload._simulation_delta_time);
    } else {
         console.log(prefix_text, "Telemetry Event:", change.doc.event, "Vehicle:", change.doc.payload._vehicle, "Offset:", change.doc.payload._offset);       
    }

    //  console.log("Retrieving updated record from:", listener_target);

    /*    

        console.log('statusCode:', response && response.statusCode); // Print the response status 
        var json_body = JSON.parse(body);
        console.log('body:', JSON.stringify(json_body, null, 4)); // Print the object



        switch (json_body.location) {
            case "olli_roller": // pjd make this a constant value
                {
                    console.log("[Patron Manager-olli_roller]", json_body.persona + ":" + json_body.persona_id, " - location:", json_body.location);
                    update_record(json_body.persona, json_body.persona_id, json_body.location, json_body.old_location); // assumption structure is the same for all
                }
                break;
            case "olli_stop":
                {
                    console.log("[Patron Manager-olli_roller]", json_body.persona + ":" + json_body.persona_id, " - location:", json_body.location);
                    update_record(json_body.persona, json_body.persona_id, json_body.location, json_body.old_location); // assumption structure is the same for all
                }
                break;
            case "registration":
                {
                    console.log("[Patron Manager-olli_roller]", json_body.persona + ":" + json_body.persona_id, " - location:", json_body.location);
                    update_record(json_body.persona, json_body.persona_id, json_body.location, json_body.old_location); // assumption structure is the same for all
                }
                break;
            case "exhibit":
                {
                    console.log("[Patron Manager-olli_roller]", json_body.persona + ":" + json_body.persona_id, " - location:", json_body.location);
                    update_record(json_body.persona, json_body.persona_id, json_body.location, json_body.old_location); // assumption structure is the same for all
                }
                break;
            default:
                {
                    console.log("[Patron Manager-olli_roller]", "Confusion Reigns");

                }
                break;
        }
    */

})

feed.on('error', function (er) {
    console.error('Since Follow always retries on errors, this must be serious', er);
    // throw er;
})

feed.follow();
