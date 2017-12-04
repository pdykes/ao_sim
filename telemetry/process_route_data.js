/*

   Process the rich json, and create an intermediate file from lidar data.
   
   pdykes@us.ibm.com
   
*/

var module_name = "parse_route_data";

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

// read route data

var fs = require("fs");
var contents = fs.readFileSync("route.json");
// Define to JSON type
var jsonContent = JSON.parse(contents);

var feature_list = [];

var feature_list = jsonContent.features;

var output_data = [];

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

        output_data.push(item);

        item_count++;
    }

});

// create matrix that can rotate buses through

console.log(item_count + " Entries ");

// the 0 ... N be olli_roller_1

// 0 64 128 192 256 320 384 448 512 576

// created a vector of locations for all 10 ollies

var olli_roller_1 = [];
var olli_roller_2 = [];
var olli_roller_3 = [];
var olli_roller_4 = [];
var olli_roller_5 = [];
var olli_roller_6 = [];
var olli_roller_7 = [];
var olli_roller_8 = [];
var olli_roller_9 = [];
var olli_roller_10 = [];

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

var telemetry_records = [];

function increment_counter(offset) {
    offset++;
    if (offset == 641) {
        offset = 0;
    }
    return offset;
}


for (i = 0; i < 641; i++) {
    
    // acquire offset for section
    console.log("Final generation offset:", i);

    olli_roller_1[i] = output_data[olli_roller_1_offset];
    olli_roller_1[i]['asset'] = "olli_roller_1";
    // debug("roller ",i,"json object:", JSON.stringify(olli_roller_1[i],null,4));
    // debug("delta_time:", olli_roller_1[i].properties.delta_time);
    olli_roller_1_offset = increment_counter(olli_roller_1_offset);
    
    olli_roller_2[i] = output_data[olli_roller_2_offset];
    olli_roller_2[i]['asset'] = "olli_roller_2";
    olli_roller_2_offset = increment_counter(olli_roller_2_offset);
    
    olli_roller_3[i] = output_data[olli_roller_3_offset];
    olli_roller_3[i]['asset'] = "olli_roller_3";
    olli_roller_3_offset = increment_counter(olli_roller_3_offset);
    
    olli_roller_4[i] = output_data[olli_roller_4_offset];
    olli_roller_4[i]['asset'] = "olli_roller_4";
    olli_roller_4_offset = increment_counter(olli_roller_4_offset);
    
    olli_roller_5[i] = output_data[olli_roller_5_offset];
    olli_roller_5[i]['asset'] = "olli_roller_5";
    olli_roller_5_offset = increment_counter(olli_roller_5_offset);
    
    olli_roller_6[i] = output_data[olli_roller_6_offset];
    olli_roller_6[i]['asset'] = "olli_roller_6";
    olli_roller_6_offset = increment_counter(olli_roller_6_offset);
    
    olli_roller_7[i] = output_data[olli_roller_7_offset];
    olli_roller_7[i]['asset'] = "olli_roller_7";
    olli_roller_7_offset = increment_counter(olli_roller_7_offset);
    
    olli_roller_8[i] = output_data[olli_roller_8_offset];
    olli_roller_8[i]['asset'] = "olli_roller_8";
    olli_roller_8_offset = increment_counter(olli_roller_8_offset);
    
    olli_roller_9[i] = output_data[olli_roller_9_offset];
    olli_roller_9[i]['asset'] = "olli_roller_9";
    olli_roller_9_offset = increment_counter(olli_roller_9_offset);
    
    olli_roller_10[i] = output_data[olli_roller_10_offset];
    olli_roller_10[i]['asset'] = "olli_roller_10";
    olli_roller_10_offset = increment_counter(olli_roller_10_offset);
    
    var rollers = [];
    rollers.push(olli_roller_10[i]);
    rollers.push(olli_roller_9[i]);
    rollers.push(olli_roller_8[i]);
    rollers.push(olli_roller_7[i]);
    rollers.push(olli_roller_6[i]);
    rollers.push(olli_roller_5[i]);
    rollers.push(olli_roller_4[i]);
    rollers.push(olli_roller_3[i]);
    rollers.push(olli_roller_3[i]);
    rollers.push(olli_roller_2[i]);
    rollers.push(olli_roller_1[i]);
    
    /*
    rollers.push(olli_roller_1[i]);
    rollers.push(olli_roller_2[i]);
    rollers.push(olli_roller_3[i]);
    rollers.push(olli_roller_4[i]);
    rollers.push(olli_roller_5[i]);
    rollers.push(olli_roller_6[i]);
    rollers.push(olli_roller_7[i]);
    rollers.push(olli_roller_8[i]);
    rollers.push(olli_roller_9[i]);
    rollers.push(olli_roller_10[i]);
    */
    
    
    telemetry_records[i] = {
        "delta_time" : olli_roller_1[i].properties.delta_time,
        "rollers" : rollers
    };
    
    /*
    telemetry_records[i].push(olli_roller_1[i]);
    telemetry_records[i].push(olli_roller_2[i]);
    telemetry_records[i].push(olli_roller_3[i]);
    telemetry_records[i].push(olli_roller_4[i]);
    telemetry_records[i].push(olli_roller_5[i]);
    telemetry_records[i].push(olli_roller_6[i]);
    telemetry_records[i].push(olli_roller_7[i]);
    telemetry_records[i].push(olli_roller_8[i]);
    telemetry_records[i].push(olli_roller_9[i]);
    telemetry_records[i].push(olli_roller_10[i]);
    */
    

}

var final_json = {
    "route"  : "red_route",
    "telemetry" : telemetry_records
};

// generate refined route_data

fs.writeFile(

    './telemetry_parsing_output_per_roller_data.json',

    JSON.stringify(output_data),

    function (err) {
        if (err) {
            console.error('Error saving output data file...');
        }
    }
);

fs.writeFile(

    './telemetry_parsing_output_telemetry_data.json',

    JSON.stringify(final_json),

    function (err) {
        if (err) {
            console.error('Error saving telemetry data file...');
        }
    }
);
