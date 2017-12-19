/* 

   PJD Dykes
   #AccessibleOlli
   mvp2
   
   patron_manager
*/

var config = require("config");

var module_name = config.get("agents.patron_manager.module_name");

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

var listener_target = config.get("global.nosql_url") +
    "/" +
    config.get("agents.patron_manager.database");

if ((process.argv[2] == "url") && (process.argv[3] !== 'undefined')) {
    listener_target = process.argv[3] + "/persona_transitions";
    console.log("Target url updated to: [" + listener_target + "], ^c to exit");
}

console.log("Listener target:", listener_target);

var request = require('request');
var follow = require('follow');

var opts = {}; // Same options paramters as before
var feed = new follow.Feed(opts);

feed.db = listener_target;
feed.since = 'now';

var async = require('async');
var parallel = require('async-parallel');

/* database management

Three databases
  - patron_registration
  - patron_roller
  - patron_stop
  
*/

var couch = null;
var db_name = config.get("agents.patron_manager.output_database");

var roller_record_key = config.get("agents.patron_manager.roller_record_key");
var stop_record_key = config.get("agents.patron_manager.stop_record_key");
var registration_record_key = config.get("agents.patron_manager.registration_record_key");
var exhibit_record_key = config.get("agents.patron_manager.exhibit_record_key");

var database_url = config.get("global.nosql_url") + "/";
var database_user = config.get("global.nosql_user");
var database_password = config.get("global.nosql_password");

var dbperf_tracking = false;

var patron_locations_db = null;

var database_interacation = true;

if (database_interaction = true) {
    try {
        // patron_locations setup
        couch = require('nano')({
            url: database_url,
            parseUrl: false
        });
        patron_locations_db = couch.use(db_name);
    } catch (err) {
        cosole.log("database init failure", err);
    }
}

// primary code path that will be called as each roller event occurs

function db_update(dbase, database_record, operation, cb) {
    var stime = null;
    var etime = null;
    var add_entry = false;
    var remove_entry = false;
    var id_key = null;

    if (operation == "add") {
        add_entry = true;
        database_record['_id'] = "patrons_" + database_record.location;
        id_key = database_record['_id'];
        debug("Adding patron to " + database_record._id);
    }
    if (operation == "remove") {
        remove_entry = true;
        database_record['_id'] = "patrons_" + database_record.old_location;
        id_key = database_record['_id'];
        debug("Removing patron from " + database_record._id);
    }
    var db_record_found = false;

    debug("Incoming object:", JSON.stringify(database_record, null, 4));

    debug("Object id to query:[" + database_record._id + "]");

    var date = new Date();
    stime = date.getTime();

    try {
        dbase.get(database_record._id, {
            revs_info: false
        }, function (err, dbbody) {
            debug("****Working on this asset in db get:", database_record._id, "*****");
            var update_record = dbbody;
            var input_array = [];
            
            if (update_record == null) {
                update_record = {};
            }
            if (!update_record.hasOwnProperty('persona_list')) {
              update_record['persona_list'] = [];  
            }
            if (!update_record.hasOwnProperty('_id')) {
              update_record['_id'] = id_key;  
            }           
            
            var db_record_found = false;
            if (!err) {
                db_record_found = true;
                debug("Database record found:", JSON.stringify(dbbody, null, 4));
                debug("Database record found, key:", "patrons_" + database_record.location);
                update_record['_rev'] = dbbody._rev;
               // input_array = dbbody.persona_list; // found the object
            } else {
                debug("Database record not found for:", "patrons_" + database_record.location);
                debug("error provided by db", err);
               // var persona_list = [];
               // update_record = {
               //     "_id": id_key,
               //    "persona_list": persona_list
               // }; // empty, time to create
               // input_array = update_record.persona_list;
            }
            
            input_array = update_record.persona_list;

            // body update (if add, put entry in, if remove, strip out and save)
            var output_array = [];
            var found = false;
            if (input_array.length > 0) {
                input_array.forEach(function (entry) {
                    if ((entry.persona == database_record.persona) &&
                        (entry.persona_id == database_record.persona_id)) {
                        entry.time = stime;
                        if (add_entry) {
                            output_array.push(entry);
                        }
                        found = true;
                    } else {
                        output_array.push(entry);
                    }
                });
            }
            if ((found == false) && (add_entry)) {
                var new_entry = {
                    persona: database_record.persona,
                    persona_id: database_record.persona_id,
                    time: stime
                };
                output_array.push(new_entry);
            }

            update_record.persona_list = output_array;
            debug("Insert record into the database");
            dbase.insert(update_record, function (err, body) {
                if (!err) {
                    if (update_record.hasOwnProperty('_rev')) {
                        debug("Database asset updated:", update_record._id);
                    } else {
                        debug("Database asset created:", update_record._id);
                    }
                    debug("Persist action complete:", JSON.stringify(update_record, null, 4));
                } else {
                    debug("Database asset insert error, throwing: ", err);
                }

                if (dbperf_tracking) {
                    var date = new Date();
                    etime = date.getTime();
                    debug(text_prefix, "db perf [" + update_record._id + "]:", etime - stime, "ms");
                }
            }); // insert
            cb(null, "Successful " + operation);
        }); // get
    } catch (err) {
        debug("load database exception:", err);
        cb(err, "Unsuccessful " + operation);
    }
}

function update_record(persona, id, location, old_location) {

    var db_record = {
        id: location,
        persona: persona,
        persona_id: id,
        location: location,
        old_location: old_location
    };

    /*
    debug("***Record patron updates ***");
    db_update(patron_locations_db, db_record, "add", function () {
        debug("***Record patron added to " + location);
    });
    debug("***Record patron remove update begins ***");
    db_update(patron_locations_db, db_record, "remove", function () {
            debug("***Record patron removed from " + old_location);
    });
    debug("***Record patron update complete ***"); 
    */

    async.parallel([
       db_update.bind(null, patron_locations_db, db_record, "add"),
       db_update.bind(null, patron_locations_db, db_record, "remove")
        ], function (err, results) {
        console.log(err, "Results:", JSON.stringify(results, null, 4));
    });

}


feed.on('change', function (change) {
    // console.log('Doc ' + '/' + change.id + ' in change ' + change.seq + ' is neither stinky nor ugly.');
    console.log("Change detected: ", JSON.stringify(change, null, 4));
    console.log("Retrieving updated record from:", listener_target);
    request(listener_target + "/" + change.id, function (error, response, body) {
        if (error != null) {
            console.log('error:', error); // Print the error if one occurred
        }
        console.log('statusCode:', response && response.statusCode); // Print the response status 
        var json_body = JSON.parse(body);
        console.log('body:', JSON.stringify(json_body, null, 4)); // Print the object


        // update the database

        // to start - simple wins:
        // simple rule: if was in, am out, bottom line (case hitting rfid twice)
        //              if was not in, and entry, am in (if odd, e.g. always in)

        console.log("[Patron Manager]", json_body.persona + ":" + json_body.persona_id, " - location:", json_body.location);
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

    });

})

feed.on('error', function (er) {
    console.error('Since Follow always retries on errors, this must be serious', er);
    // throw er;
})

feed.follow();
