/*

   Process the rich json, and create an intermediate file from lidar data.
   
   pdykes@us.ibm.com
   
*/

var module_name = "what3words_preprocess";

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

var fs = require("fs");
var contents = fs.readFileSync("route.json");
var http = require("https");
var request = require('request');
var rp = require('request-promise');
var asyncForEach = require('async-foreach').forEach;
var async = require('async');
var waterfall = require('async-waterfall');


// Define to JSON type

var jsonContent = JSON.parse(contents);

var feature_list = [];
var feature_list = jsonContent.features;

var API_Key = "T2CW137J";



route_locations = [];

if (feature_list[0].properties.timestamp !== undefined) {
    var start_time = parseInt(feature_list[0].properties.timestamp);
} else {
    console.log("Unexpected Telemetry File Format, exiting");
    return;
}

var interval = 500;

debug("Reference T0 time =", start_time);

// item_count = 0;

/*

function get_what3words_record(lat, long) {

    call_options = what3words_options_template;
    var response_body = null;

    debug("Initial what3words options:", JSON.stringify(call_options, null, 4));

    var uri = call_options.path.replace("LAT", lat);
    var turi = uri.replace("LONG", long);
    var final_uri = turi.replace("MY-API-KEY", API_Key);

    call_options.path = final_uri;

    debug("Final what3words options:", JSON.stringify(call_options, null, 4));
    try {
        var req = http.request(call_options, function (res) {
            var chunks = [];

            res.on("data", function (chunk) {
                chunks.push(chunk);
            });

            res.on("end", function () {
                var body = Buffer.concat(chunks);
                // console.log(body.toString());
                response_body = body.toString();
                req.end();
                debug("Completed request for lat:", lat, "long:", long);
                return response_body;
            });
        });
    } catch (err) {
        console.log("error occured:", err);
    };

    
    // req.end();
    
    // debug("Completed request for lat:", lat, "long:", long);
    
    // return response_body;
    
}

function request_get_what3words_record(lat, long) {

    call_options = what3words_options_template;
    var response_body = null;

    debug("Initial what3words options:", JSON.stringify(call_options, null, 4));

    var uri = call_options.path.replace("LAT", lat);
    var turi = uri.replace("LONG", long);
    var final_uri = turi.replace("MY-API-KEY", API_Key);

    call_options.path = final_uri;

    debug("Final what3words options:", JSON.stringify(call_options, null, 4));

    var request_uri = "https://" +
        call_options.hostname +
        call_options.path;

    try {

        var json_message = "{}";

        var options = {
            uri: request_uri,
            method: call_options.method,
            json: json_message,
            headers: {
                'User-Agent': 'node/8.10'
            }
        };

        debug("request options:", options);

        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("Message submitted successfully:", JSON.stringify(body, null, 4));
                return body;
            } else {
                console.log("Error:", error);
                return error;
            }
        });
    } catch (error) {
        console.log("Submit Message to agent Error for:", error);
        return error;
    }

}

*/

function get_w3_data(options) {


    debug("Entered get_w3_data");
    //request(options, function (error, response, body) {
    //    if (!error && response.statusCode == 200) {
    // console.log("Message submitted successfully:", JSON.stringify(body, null, 4));
    rp(options)
        .then(function (body) {
            debug("What3words Request - Message submitted successfully:", JSON.stringify(body, null, 4));
            return body;
            /*
             debug("offset:", route_location_offset);
             route_locations[route_location_offset]['what3words'] = body;
             debug("What3words Request - Testing resulting output:", JSON.stringify(route_locations[route_location_offset]['what3words'], null, 4));
             debug("What3words Request - Testing resulting final output:", JSON.stringify(route_locations[route_location_offset], null, 4));
             */
            // route_location_offset++;
            /*
            call_options = null;
            if (feature_list.length - 1 == item_count) {
                debug("Write out summary files...");
                fs.writeFileSync('./resource_location_data.json', JSON.stringify(route_locations, 4, null), 'utf-8');
            }
        
          */
        })
        /*
        .then(function (data2) {
            if (feature_list.length - 1 == item_count) {
                debug("Write out summary files...");
                fs.writeFileSync('./resource_location_data.json', JSON.stringify(route_locations, 4, null), 'utf-8');
            }
        })
        */
        .catch(function (err) {
            console.log("Aborting Error:", err);
            return err;
        });
}

var route_location_offset = -1;
var item_count = -1;

feature_list.forEach(function (item) {

    // asyncForEach(feature_list, function (item, item_count, arr) {

    item_count++

    current_time = parseInt(item.properties.timestamp);

    current_delta = current_time - start_time;

    if ((current_time % interval) == 0) {

        route_location_offset++;

        console.log("---------General Offset:", item_count, "Tracked Offset:", route_location_offset, "--------------------");
        debug("For record id:", route_location_offset, "Time interval:", current_delta);

        delete item.type;

        debug("Item:", item);

        item.properties['delta_time'] = current_delta;

        var call_options = {
            "method": "GET",
            "hostname": "api.what3words.com",
            "port": null,
            "path": "/v2/reverse?coords=LAT%2CLONG&key=MY-API-KEY&lang=en&format=json&display=full",
            "headers": {}
        };

        debug("Initial what3words options:", JSON.stringify(call_options, null, 4));



        route_locations[route_location_offset] = {
            offset: route_location_offset,
            delta_time: current_delta,
            timestamp: item.properties.timestamp,
            lat: item.geometry.coordinates[1],
            long: item.geometry.coordinates[0],
            properties: item.properties,
            geometry: item.geometry,
            what3words_query: "next",
            what3words: "inabit"
        };

        var uri = call_options.path.replace("LAT", route_locations[route_location_offset].lat);
        var turi = uri.replace("LONG", route_locations[route_location_offset].long);
        var final_uri = turi.replace("MY-API-KEY", API_Key);

        call_options.path = final_uri;

        var request_uri = "https://" +
            call_options.hostname +
            call_options.path;

        var json_message = "{}";

        var options = {
            uri: request_uri,
            method: call_options.method,
            json: json_message,
            headers: {
                'User-Agent': 'node/8.10'
            }
        };

        route_locations[route_location_offset]['what3words_query'] = options;

        debug("Final what3words options:",
            JSON.stringify(route_locations[route_location_offset], null, 4));

    }

    if (feature_list.length - 1 == item_count) {
        debug("Write out summary files...");
        fs.writeFileSync('./resource_location_data.json', JSON.stringify(route_locations, 4, null), 'utf-8');
    }

});

debug("initial data structure creation complete");

// core processing is complete, do request calls using data...

debug("batch processing remote web site");

function evaluate_data(item, callback) { // place holder for compute of some time

    debug("Phase 1 - evaluate data");
    callback(null, item);
}

function retrieve_record(item, callback) {

    debug("Phase 2 - process web request");


    rp(item.what3words_query)
        .then(function (body) {
            debug("What3words Request - Message submitted successfully:", JSON.stringify(body, null, 4));
            // debug("offset:", item.offset);
            // route_locations[item.offset]['what3words'] = body;
            callback(null, item, body);
        })
        .catch(function (err) {
            console.log("Aborting, error processing item:", item, "Error:", err);
            callback(err);
        });

    // var body = {
    //    "pjdtemp" :"some junk"
    // };
    // callback(null, item, body);
}

function sleep_a_bit(item, body, callback) { // deal with api service monitor to frequent calls

    debug("Phase Sleep a bit - api countes a chance to reset");
    setTimeout(function() {
    }, 15000);
    callback(null, item, body);
}

function verify_check_retrieve_record(item, body, callback) {   // one or more errors can occur

    debug("Phase 2a - verify and reprocess web request if needed");
    /*

    if (!item.what3words.hasOwnProperty("crs")) {
        console.log("Repeat query required for record location:", item.offset);
        rp(item.what3words_query)
            .then(function (newbody) {
                debug("What3words Request - Message submitted successfully:", JSON.stringify(newbody, null, 4));
                // debug("offset:", item.offset);
                // route_locations[item.offset]['what3words'] = body;
                callback(null, item, newbody);
            })
            .catch(function (err) {
                console.log("Aborting, error processing item:", item, "Error:", err);
                callback(err);
            });
    } else { // no issues
        callback(null, item, body);
    }
    */
    callback(null, item, body);
}

function update_resource_location_record(item, body, callback) {

    debug("Phase 3 - process web request");
    debug("update record:", item);
    debug("http body:", body);
    // extra stuff, lets take off
    if (body.status.status != 200) {
        console.log("Warning route location offset[" + item.offset + "] possible problem");
    }
    delete body.status;
    delete body.thanks;
    route_locations[item.offset]['what3words'] = body;
    debug("post update record:", route_locations[item.offset]);
    callback(null, item);
}

function write_resource_location_artifact(item, callback) {
    try {
        debug("Phase 4 - process web request, item offset:", item.offset, "of:", route_locations.length);
        if (route_locations.length - 1 == item.offset) {
            debug("Write out summary files...");
            fs.writeFileSync('./final_resource_location_data.json', JSON.stringify(route_locations, 4, null), 'utf-8');
        }
        callback(null, item);
    } catch (err) {
        console.log("Aborting, error processing item:", item, "Error:", err);
        callback(err);
    }
}

route_locations.forEach(function (item) {

    waterfall([ //first function needs async.apply to post attributes, reset can get the 
            async.apply(evaluate_data, item),
            retrieve_record,
            sleep_a_bit,
            verify_check_retrieve_record,
            sleep_a_bit,
            update_resource_location_record,
            write_resource_location_artifact
            ],
        function (err, results) {
            debug("Event result:", JSON.stringify(results, null, 4));
            if (err !== null) {
                debug("Error Result:",
                    err);
            }
        });

});
