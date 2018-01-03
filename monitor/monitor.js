/*

   Accessible Olli Simulation Controller
    - RFID default mode
    - Simulation mode (optional)
    
    pdykes@us.ibm.com

*/


var net = require('net');
var fs = require('fs');
var async = require('async');
var config = require('config');

var module_name = config.get("agents.monitor.module_name");

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

var writeJsonFile = require('write-json-file');
var loadJsonFile = require('load-json-file');
// process command line args
const commandLineArgs = require('command-line-args');

var reg_filename = "registration.json";
var track_filename = "tracking.json";
var loc_filename = "location.json";

var registrations_filename = null;
var tracking_filename = null;
var location_filename = null;

if (process.env.NODE_CONFIG_DIR !== undefined) {
    var registrations_filename = process.env.NODE_CONFIG_DIR + "/" + reg_filename;
    var tracking_filename = process.env.NODE_CONFIG_DIR + "/" + track_filename;
    var location_filename = process.env.NODE_CONFIG_DIR + "/" + loc_filename;
} else {
    console.log("Error NODE_CONFIG_DIR not set, please set and restart");
    return;
}

var registation_complete = false;

var text_prefix = "SmartPass:";

var simulation_mode = true;
var rfid_mode = false;
var simulation_counter = 0;
var simulation_interval_object = null;
var simulation_start_time = null;
var simulation_location = [];
var tracking_simulation_data = [];

/* tracking who is in which state and reporting

Sparce array, holding refernece to where each person
is now, and as changes occur, the list of who is where
is emitted.

persona_location_state["Brent:42"] = {
   "registration"   : true/false,
   "exhibit"        : true/false,
   "olli_roller"    : true/false,
   "olli_stop"      : true/false
}
   
*/
var persona_location_state = [];

var database_interaction = true;

var show_verbose_data = true;

var dbperf_tracking = true;

var sim_interval = config.get("agents.monitor.interval");


//  todo
//    support when reader fails, just wiat
//    post items that have happened > 1 second to database
//    create agent that can process this and put a clean version
//     of data

var time_gap = config.get("agents.monitor.time_gap");

var client = new net.Socket();

var host_ip = config.get("agents.monitor.rfid_ip");
var host_port = config.get("agents.monitor.rfid_port");

var current_epc = null;

var persona_template = {
    "persona": "tbd",
    "id": "0",
    "epc": "tbd"
};

var busy = false;

var registration_records = null;

var in_memory_database = [];

var location_records = null;

var couch = null;
var database = config.get("agents.monitor.database");

var database_url = config.get("global.nosql_url"); // 'http://localhost:5984'
var database_user = config.get("global.nosql_user");
var database_password = config.get("global.nosql_password");
var db = null;


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
        name: 'rfid_ip',
        type: String,
        multiple: false,
        alias: 'i',
        defaultValue: host_ip
    },
    {
        name: 'rfid_port',
        type: String,
        multiple: false,
        alias: 'p',
        defaultValue: host_port
    },
    {
        name: 'persona_registration',
        type: String,
        multiple: false,
        alias: 'r',
        defaultValue: registrations_filename
    },
    {
        name: 'location_registration',
        type: String,
        multiple: false,
        alias: 'l',
        defaultValue: location_filename
    },
    {
        name: 'tracking_output',
        type: String,
        multiple: false,
        alias: 't',
        defaultValue: tracking_filename
    },
    {
        name: 'rfid_mode',
        alias: 'f',
        type: Boolean,
        defaultValue: rfid_mode
    },
    {
        name: 'persona_transitions-db',
        type: String,
        multiple: false,
        alias: 's',
        defaultValue: database
    },
    {
        name: 'olli_roller_db',
        type: String,
        multiple: false,
        alias: 'c',
        defaultValue: database
    },
    {
        name: 'olli_stop_db',
        type: String,
        multiple: false,
        alias: 'z',
        defaultValue: database
    },
    {
        name: 'interval',
        type: String,
        multiple: false,
        alias: 'n',
        defaultValue: sim_interval
    },
    {
        name: 'registration_db',
        type: String,
        multiple: false,
        alias: 'e',
        defaultValue: database
    },
    {
        name: 'database_url',
        type: String,
        multiple: false,
        alias: 'd',
        defaultValue: database_url
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

if (cli_options.rfid_mode !== null) {
    debug("cli_options.rfid_mode:", cli_options.rfid_mode);
    if (!cli_options.rfid_mode) { // default is to NOT be in RFID mode
        simulation_mode = true;
    } else {
        simulation_mode = false;
    }
    debug("post cli, simulation_mode value:", simulation_mode);
}

if (cli_options.database_url !== null) {
    debug("cli_options.database_url:", cli_options.database_url);
    database_url = cli_options.database_url;
}

if (cli_options.rfid_ip !== null) {
    debug("cli_options.rfid_ip:", cli_options.rfid_ip);
    host_ip = cli_options.rfid_ip;
}

if (cli_options.rfid_port !== null) {
    debug("cli_options.rfid_port:", cli_options.rfid_port);
    host_port = cli_options.rfid_port;
}

if (cli_options.location_registration !== null) {
    debug("cli_options.location_registration:", cli_options.location_registration);
    location_filename = cli_options.location_registration;
}

if (cli_options.persona_registration !== null) {
    debug("cli_options.persona_registration:", cli_options.persona_registration);
    registrations_filename = cli_options.persona_registration;
}

if (cli_options.tracking_output !== null) {
    debug("cli_options.tracking_output:", cli_options.tracking_output);
    tracking_filename = cli_options.tracking_output;
}


if (cli_options.interval !== null) {
    debug("cli_options.interval:", cli_options.interval);
    sim_interval = cli_options.interval;
}

if (database_interaction = true) {

    couch = require('nano')({
        url: database_url,
        parseUrl: false
    });
    db = couch.use(database);
}

var transaction_data = [];

var visit_tracker = [];

var persona_location = [];

var properties = [
    {
        persona: 'persona',
        validator: /^[a-zA-Z\s\-]+$/,
        warning: 'Persona must be only letters, spaces, or dashes'
    },
    {
        id: 'id',
        hidden: true
    }
];

function reset_state() {
    busy = false;
    current_epc = null;
}

function db_update(dbase, database_record) {
    stime = null;
    etime = null;

    if (dbperf_tracking) {
        var date = new Date();
        stime = date.getTime();
    }

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
            if (dbperf_tracking) {
                var date = new Date();
                etime = date.getTime();
                debug(text_prefix, "db perf [" + database_record._id + "]:", etime - stime, "ms");
            }
        }); // get
    } catch (err) {
        debug("load database exception:", err);
    }
}

function persona_transition_record(reg_record) { // note, this just replaces the record, always


    debug("Database asset get request");
    if (reg_record.persona == "init") return;
    var asset_record = reg_record; // database record stored in sparse array
    debug("Persisting Registration Record's DB Record:", JSON.stringify(reg_record, 4, null));
    db_update(db, reg_record);

}


function reset_persona_record(reg_record) { // note, this just replaces the record, always

    debug("Database asset get request");
    if (reg_record.persona == "init") return;
    var asset_record = in_memory_database[reg_record.epc]; // database record stored in sparse array
    debug("Persisting Registration Record's DB Record:", JSON.stringify(reg_record, 4, null));
    db_update(db, asset_record);

}

function load_registration_information(callback) {
    var registrations_records_in = null;
    var location_data_in = null;


    debug(text_prefix, "****Load the registration data");

    fs.readFile(registrations_filename, 'utf8', function (err, registrations_records_in) {
        registration_records = JSON.parse(registrations_records_in);
        for (var i = 0; i < registration_records.length; i++) {
            if (registration_records[i].persona != "init") {
                console.log(text_prefix, "Registation records:[" + i + "]", "{", registration_records[i].persona + ":" + registration_records[i].id, "SmartPass Id[" + registration_records[i].epc + "] }");

                //  **** Note: these rely on a sparse matrics of javascript arrays
                // timer track upon entry
                visit_tracker[registration_records[i].epc] = parseInt(0);
                // location tracking
                persona_location[registration_records[i].epc] = "exhibit"; // not in any of the three key entities at init

                var date = new Date();
                var event_time = date.getTime();

                var _id = registration_records[i].persona + ":" + registration_records[i].id;

                persona_location_state[_id] = {
                    "exhibit": false,
                    "registration": false,
                    "olli_stop": false,
                    "olli_roller": false
                };

                if (database_interaction == true) {

                    var asset_record = {
                        _id: _id,
                        persona: registration_records[i].persona,
                        persona_id: registration_records[i].id,
                        transition: "initialize",
                        time: event_time,
                        delta_time: 0,
                        preferences: registration_records[i].preferences,
                        location: persona_location[registration_records[i].epc],
                        old_location: persona_location[registration_records[i].epc],
                        smartpass_id: registration_records[i].epc
                    };

                    // sparse array, use to create database entries post in memory data registration processing
                    in_memory_database[registration_records[i].epc] = asset_record;
                }
            }
        }
        console.log(text_prefix, 'Registration File Loaded:', registrations_filename);
        registation_complete = true;
        callback(null, "Init: Phase 1");
    });
}



function load_location(callback) {


    debug(text_prefix, "****Load the location data");

    fs.readFile(location_filename, 'utf8', function (err, location_data_in) {
        var location_data = JSON.parse(location_data_in);
        location_records = location_data.locations;
        for (var i = 0; i < location_records.length; i++) {
            console.log(text_prefix, "Location records:[" + i + "]", "{", location_records[i].antennaPort + ":" + location_records[i].location + "] }");

            simulation_location[location_records[i].location] = location_records[i].antennaPort;
            debug("Simulation Location Mapping [" + location_records[i].location + "]: ",
                "antennaPort:", simulation_location[location_records[i].location]);
        }
        debug(text_prefix, 'Location File Loaded:', location_filename);
        callback(null, "Init: Phase 2");
    });
}

function show_items(x) {
    debug("Show Items:", JSON.stringify(x, null, 4));
}

function load_database(ldb_callback) {

    // map is a higher level function, synchronous by definition
    // var result = registration_records.map(show_items)
    debug("Entering load_database...");

    if (database_interaction) {
        debug(text_prefix, "****Load the database - begin");
        var result = registration_records.map(reset_persona_record);
        ldb_callback(null, "Init: Phase 3");
    } else {
        var result = registration_records.map(show_items);
        ldb_callback(null, "Init: Phase 3");
    }

}


function simulation_next_events() {

    // loop based on the former tracking data

    debug(text_prefix, "****Establish the simulation events");

    date = new Date();
    time_ms = date.getTime();

    // debug("Simulation Counter:", simulation_counter, "Simulated Event Time:", tracking_simulation_data[simulation_counter].delta_time + simulation_start_time, "Current Time:", time_ms);

    while ((simulation_counter < tracking_simulation_data.length) && (tracking_simulation_data[simulation_counter].delta_time + simulation_start_time <= time_ms)) {

        debug("Simulation Counter:", simulation_counter);
        debug("Current Time:", time_ms);
        debug("Simulated Event Time Delta:", tracking_simulation_data[simulation_counter].delta_time);
        debug("Simulated Event Time:", tracking_simulation_data[simulation_counter].delta_time + simulation_start_time);
        var event_data = {
            epc: tracking_simulation_data[simulation_counter].smartpass_id,
            antennaPort: simulation_location[tracking_simulation_data[simulation_counter].transition]
        };
        debug("Simulation Event data:", JSON.stringify(event_data));
        monitor(event_data);
        simulation_counter++;
    }
    if (simulation_counter >= tracking_simulation_data.length) {
        console.log(text_prefix, "Simulation Mode Complete")
        process.exit();
    }
}

function establish_simluation_start(callback) {

    debug(text_prefix, "****Establish the simulation time");

    var date = new Date();
    simulation_start_time = date.getTime(); // establish time start in milliseconds
    console.log(text_prefix, 'Simulation start time established');
    callback(null, "Init: Phase 4 [Time:" + simulation_start_time + "]");

}

function connect_to_rfid(callback) {

    debug("Entering connect_to_rfid...");

    debug(text_prefix, "****Connect to the RFID Reader");
    client.connect(host_port, host_ip, function () {
        console.log(text_prefix, 'Connected to speedway [ host:' + host_ip + ', port:' + host_port + ']');
        callback(null, "Init: Phase 5");
    });
}



client.on('data', function (data) {
    try {
        if (registation_complete == false) {
            console.log(text_prefix, "Events arrived before registration prepared, waiting");
            return;
        }
        var parsing_string = data + ''; // convert to a string
        var smartPassRecords = parsing_string.split("\n");

        for (i = 0; i < smartPassRecords.length - 1; i++) {
            var clean_up = smartPassRecords[i].replace(/(?:\r\n|\r|\n)/g, "");
            var json_data = JSON.parse(clean_up);
            monitor(json_data);
        }
    } catch (err) {
        if (!err.message.includes('Unexpected token')) { // most common annoying error
            console.log(text_prefix, "Error Processing Record: [" + data + "]");
            console.log(text_prefix, "Specific Error:", err.message);
            debug(text_prefix, "Specific Error:", err);
        }
    }
});

client.on('close', function () {
    console.log(text_prefix, 'Connection closed');
});

client.on('error', function (ex) {
    console.log(text_prefix, "Issue connecting to the Impinj Reader at IP:[" + host_ip + "] Port:[" + host_port + "], verify is opertional and web console https://<ip address> has been visited to activate the reader.");
    console.log(text_prefix, "Exception recieved:", ex);
});


process.on('SIGINT', function () {
    console.log(text_prefix, "Caught interrupt signal");

    if (!simulation_mode) {
        writeJsonFile(tracking_filename, transaction_data).then(() => {
            console.log(text_prefix, 'Verified Registration File, complete, exiting...', tracking_filename);
            process.exit();
        });
    } else {
        clearInterval(simulation_interval_object);
        process.exit();
    }
});


function simulate_rfid(callback) {

    debug("Entering simulate_rfid...");

    loadJsonFile(tracking_filename).then(json => {
        // tracking_simulation_data = json;
        for (i = 0; i < json.length; i++) {
            tracking_simulation_data[i] = json[i];
            debug("tracking_simulation_data[" + i + "]:", JSON.stringify(tracking_simulation_data[i], null, 4));
        }
        debug("Simulation Data:", json);
        // keep it simple...

        simulation_interval_object = setInterval(simulation_next_events, sim_interval);

        callback(null, "Init: Phase 5 (simulation mode)");
    });
}


function monitor(json_data) {

    debug("Entering monitor...");

    if (json_data.epc !== 'undefined') {
        if (current_epc == json_data.epc) {
            reset_state();
            debug(text_prefix, "current_epc failure");
            return;
        }
    } else {
        reset_state();
        debug(text_prefix, "current_epc not set error");
        return;
    }

    if (busy == true) { // skip entries, focus on processing good hits
        debug(text_prefix, "function busy error");
        return;
    }

    busy = true;
    current_epc = json_data.epc;

    var date = new Date();
    var event_time = date.getTime();
    var delta_time = event_time - simulation_start_time;

    // console.log(event_time,(parseInt(visit_tracker[json_data.epc]) + 2500));
    if (event_time < (visit_tracker[json_data.epc] + time_gap)) {
        // console.log(text_prefix, "detected duplicate close time proximity");
        reset_state();
        return;
    }

    debug(text_prefix, "Incoming:", JSON.stringify(json_data, null, 4));

    var transition = null;
    var persona = null;
    var persona_id = null;
    var smartpass_id = null;


    // determine transition
    var transition_found = false;
    for (var i = 0;
        ((i < location_records.length) && (transition_found == false)); i++) {
        if (json_data.antennaPort == location_records[i].antennaPort) {
            transition_found = true;
            // debug(text_prefix,"transition match:", location_records[i].location);
            transition = location_records[i].location;
        }
    }

    if (transition_found == false) {
        debug(text_prefix, "Record not a match (l):", JSON.stringify(json_data, null, 4));
        reset_state();
        return;
    }

    // determine the logical persona
    var registration_found = false;
    for (var i = 0;
        ((i < registration_records.length) && (registration_found == false)); i++) {
        if (registration_records[i].persona != "init") {
            if (registration_records[i].epc == json_data.epc) {
                registration_found = true;
                debug(text_prefix, "Registation match:", registration_records[i].persona);
                persona = registration_records[i].persona;
                persona_id = registration_records[i].id;
                smartpass_id = registration_records[i].epc;
            }
        }
    }

    if (registration_found == false) {
        console.log(text_prefix, "Record not a match error (p):", JSON.stringify(json_data, null, 4));
        reset_state();
        return;
    }

    var rec_id = persona + ":" + persona_id;

    var previous_location = persona_location[smartpass_id];

    // four state:  exhibit, registration, olli_stop, olli_roller

    if (transition == "registration") {
        // debug("reg logic");

        // had always set to registration, but making it explicit help new folks working on code
        switch (persona_location[smartpass_id]) { // enter registration area
            case "exhibit":
                persona_location[smartpass_id] = "registration";
            case "olli_roller":
                persona_location[smartpass_id] = "registration"; // some how missed transition out of roller, no worries
                break;
            case "registration":
                persona_location[smartpass_id] = "registration";
                break;
            case "olli_stop":
                persona_location[smartpass_id] = "registration";
                break;
            default:
                break;
        }
    }

    if ((transition == "olli_roller")) { // make state changes explicit
        // debug("or logic");

        switch (persona_location[smartpass_id]) {
            case "olli_roller":
                persona_location[smartpass_id] = "exhibit"; // some how missed transition out of roller, no worries
                break;
            case "exhibit":
                persona_location[smartpass_id] = "olli_roller"; // was outside, now inside
                break;
            case "olli_stop":
                persona_location[smartpass_id] = "olli_roller"; // was inside, now outside
                break;
            case "registration":
                persona_location[smartpass_id] = "olli_roller"; // registering then in stop            
                break;
            default:
                break;
        }
    }

    if ((transition == "olli_stop_entry") || (transition == "olli_stop_side_exit") || (transition == "olli_stop_end_exit")) {
        // debug("os logic");

        switch (persona_location[smartpass_id]) {
            case "olli_roller":
                persona_location[smartpass_id] = "olli_stop"; // some how missed transition out of roller, no worries
                break;
            case "exhibit":
                persona_location[smartpass_id] = "olli_stop"; // was outside, now inside
                break;
            case "olli_stop":
                persona_location[smartpass_id] = "exhibit"; // was inside, now outside
                break;
            case "registration":
                persona_location[smartpass_id] = "olli_stop"; // registering then in stop            
                break;
            default:
                break;
        }
    }

    // update persona_location_state[_id], used to summarize active persona in each location, this feature will await mvp2
    persona_location_state[rec_id][persona_location[smartpass_id]] = true;
    persona_location_state[rec_id][previous_location] = false;

    if (!simulation_mode) { // dont track if simulation mode
        transaction_data.push({ // simulation logging
            _id: rec_id,
            persona: persona,
            persona_id: persona_id,
            transition: transition,
            preferences: in_memory_database[smartpass_id].preferences,
            time: event_time,
            delta_time: delta_time,
            location: persona_location[smartpass_id],
            old_location: previous_location,
            smartpass_id: smartpass_id
        });
    }

    var event_record = {
        _id: rec_id,
        persona: persona,
        persona_id: persona_id,
        transition: transition,
        preferences: in_memory_database[smartpass_id].preferences,
        time: event_time,
        delta_time: delta_time,
        location: persona_location[smartpass_id],
        old_location: previous_location,
        smartpass_id: smartpass_id
    };

    // sets the timer, so if rfid does another read (happens very often) need to shield the code
    visit_tracker[json_data.epc] = event_time;

    if (database_interaction) {
        persona_transition_record(event_record);
        debug(text_prefix, "Data base Update recorded:", JSON.stringify(event_record, null, 4));
    }

    console.log(text_prefix, "Persona:", event_record._id, "Location:", event_record.location, "Transistion:", event_record.transition, "Simulation Time:", event_time);

    (text_prefix, "Reported:", JSON.stringify(event_record, null, 4));

    reset_state();
}


// deterministic to start

// if in simulation mode, we will override the connect_to_rfid, and use a simulator to drive the
// events

// RFID IT in place ==>  connnect_to_rfid
// Simulator        ==>  simulate_rfid

if (!simulation_mode) {
    debug("Entering live RFID reading function");
    async.series([
   load_registration_information,
   load_location,
   load_database,
   establish_simluation_start,
   connect_to_rfid
], function (err, results) {
        (JSON.stringify(results, null, 4));
    });
} else {
    debug("Entering simulated operation function");
    async.series([
   load_registration_information,
   load_location,
   load_database,
   establish_simluation_start,
   simulate_rfid
], function (err, results) {
        (JSON.stringify(results, null, 4));
    });
}


// Note the tcp listenr started in connect_to_rfid will continue operate runtime...
