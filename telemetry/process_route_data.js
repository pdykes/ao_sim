/*

   Process the rich json, and create an intermediate file from lidar data.
   
   pdykes@us.ibm.com
   
*/

var module_name = "parse_route_data";

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

// read route data

var fs = require("fs");

/*

var contents = fs.readFileSync("route.json");
// Define to JSON type
var jsonContent = JSON.parse(contents);

var feature_list = [];

var feature_list = jsonContent.features;

var resource_location_data = [];

var interval = 500;

// parse route data

// get the initial time, we will consider t0

if (feature_list[0].properties.timestamp !== undefined) {
    var start_time = parseInt(feature_list[0].properties.timestamp);
} else {
    console.log("Unexpected Telemetry File Format, exiting");
    return;
}

debug("Reference T0 time =", start_time);

item_count = 0;

feature_list.forEach(function (item) {

    current_time = parseInt(item.properties.timestamp);

    current_delta = current_time - start_time;

    if ((current_time % interval) == 0) {
        debug("For record id:", item_count, "Time interval:", current_delta);

        delete item.type;

        item.properties['delta_time'] = current_delta;

        resource_location_data.push(item);

        item_count++;
    }

});

*/

// for now, user does process_route data...
var contents = fs.readFileSync("final_resource_location_data.json");
// Define to JSON type
var jsonContent = JSON.parse(contents);

var resource_location_data = jsonContent;

// create matrix that can rotate buses through

console.log(resource_location_data.length + " Entries ");

// the 0 ... N be olli_roller_1

// 0 64 128 192 256 320 384 448 512 576

// created a vector of locations for all 10 ollies

var olli_roller_1 = [];
var olli_roller_2 = [];
var olli_roller_3 = [];

/*
var olli_roller_4 = [];
var olli_roller_5 = [];
var olli_roller_6 = [];
var olli_roller_7 = [];
var olli_roller_8 = [];
var olli_roller_9 = [];
var olli_roller_10 = [];
*/

var olli_roller_1_offset = 0;
var olli_roller_2_offset = 208;
var olli_roller_3_offset = 416;

/*
208 416
var olli_roller_1_offset = 0;
var olli_roller_2_offset = 64;
var olli_roller_3_offset = 124;
var olli_roller_4_offset = 192;
var olli_roller_5_offset = 256;
var olli_roller_6_offset = 320;
var olli_roller_7_offset = 384;
var olli_roller_8_offset = 448;
var olli_roller_9_offset = 512;
var olli_roller_10_offset = 576;
*/

function ExecutionException(message) {
    this.message = message;
    this.name = 'UserException';
}

var telemetry_records = [];

function increment_counter(temp_offset) {
    temp_offset++;
    if (temp_offset == 641) {
        temp_offset = 0;
    }
    return temp_offset;
}

var previous_time = -1;

for (i = 0; i < 641; i++) {


    // acquire offset for section
    console.log("iteration offset:", i);
    debug("olli 1 offset", olli_roller_1_offset);
    debug("olli 2 offset", olli_roller_2_offset);
    debug("olli 3 offset", olli_roller_3_offset);
    debug("delta_time", resource_location_data[i].delta_time);

    if (previous_time > resource_location_data[i].delta_time) {
        console.log("Error, time sequence:" + previous_time + " > " + resource_location_data[i].delta_time);
        console.log("Iteration:", i);

        debug("roller 1 offset:", olli_roller_1_offset,
            "roller 2 offset:", olli_roller_2_offset,
            "roller 3 offset:", olli_roller_3_offset);
        throw new ExecutionException(Error, "iterator:" + i);
    } else {
        previous_time = resource_location_data[i].delta_time;
    }


    // deep copy is needed vs. by references
    olli_roller_1[i] = JSON.parse(JSON.stringify(resource_location_data[olli_roller_1_offset]));

    /*

    debug("resource_location_data[" + i + "]", JSON.stringify(resource_location_data[i], null, 4));

    debug("resource_location_data[" + olli_roller_1_offset + "]", JSON.stringify(resource_location_data[olli_roller_1_offset], null, 4));

    debug("olli_roller_1[" + i + "]", JSON.stringify(olli_roller_1[i], null, 4));
    
    */

        debug("before setting delta time value - resource_location_data[" + i + "]", JSON.stringify(resource_location_data[180], null, 4));

   olli_roller_2[i] = JSON.parse(JSON.stringify(resource_location_data[olli_roller_2_offset]));
    
        debug("after setting resource location value - resource_location_data[" + i + "]", JSON.stringify(resource_location_data[180], null, 4));


    olli_roller_3[i] = JSON.parse(JSON.stringify(resource_location_data[olli_roller_3_offset]));




    // sync up delta time...
    
    var thetime = resource_location_data[i].delta_time;
    
    olli_roller_1[i].delta_time = thetime;
    olli_roller_2[i].delta_time = thetime;
    olli_roller_3[i].delta_time = thetime;
    
    debug("after setting the delta_time time value - resource_location_data[" + i + "]", JSON.stringify(resource_location_data[180], null, 4));


    debug("roller 1 delta time:", olli_roller_1[i].delta_time,
        "roller 2 delta time:", olli_roller_2[i].delta_time,
        "roller 3 delta time:", olli_roller_3[i].delta_time);

    olli_roller_1[i].properties.delta_time = thetime;
    olli_roller_2[i].properties.delta_time = thetime;
    olli_roller_3[i].properties.delta_time = thetime;
    
     debug("after setting the delta_time time value - resource_location_data[" + i + "]", JSON.stringify(resource_location_data[180], null, 4));

    debug("roller 1 properties delta time:", olli_roller_1[i].properties.delta_time,
        "roller 2 properties delta time:",
        olli_roller_2[i].properties.delta_time,
        "roller 3 properties delta time:", olli_roller_3[i].properties.delta_time);

    var rollers = {
        "olli_1": olli_roller_1[i],
        "olli_2": olli_roller_2[i],
        "olli_3": olli_roller_3[i]
    };

    telemetry_records[i] = {
        "simulation_offset": i,
        "delta_time": thetime,
        "olli_vehicles": rollers
    };


    debug("telemetry_records[" + i + "]", JSON.stringify(telemetry_records[i], null, 4));


    
    olli_roller_1_offset = increment_counter(olli_roller_1_offset);
    olli_roller_2_offset = increment_counter(olli_roller_2_offset);
    olli_roller_3_offset = increment_counter(olli_roller_3_offset);
}

var final_json = {
    "route": "red_route",
    "telemetry": telemetry_records
};


fs.writeFile(

    './telemetry_data.json',

    JSON.stringify(final_json),

    function (err) {
        if (err) {
            console.error('Error saving telemetry data file...');
        }
    }
);
