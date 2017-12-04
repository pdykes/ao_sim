/*

   Agent Proxy Client Example - General Simulator
    
    pdykes@us.ibm.com

*/



var config = require('config');

var module_name = "generic_agent";

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

var request = require('request');

// acquire the agent name from the command line

var found = false;
var listen_here = [];

var agent_proxy_client = process.argv[2];
debug("agent name (argv 2):", agent_proxy_client);

if (agent_proxy_client == null) {
    console.log("First parameter is the name of the agent_proxy client, please check configuration/");
    return;
}

var prefix_txt = "[ " + module_name +
    " " + agent_proxy_client +
    " ]";

var simulation_active = false;
var simulation_counter = 0;
var simulation_interval_object = null;
var simulation_start_time = 0;
var simulation_location = [];
var sim_interval = config.get("agent_proxy.simulation_interval");

var agent_config = config.get("agent_proxy.proxy_list");

var agent_name = null;
var agent_instance = null;
var agent_database = null;
var agent_url = null;
var agent_to_device_key = null;
var agent_from_device_key = null;

var agent_version = "0.0.1";
var agent_proxy_endpoint_url = null;

agent_config.forEach(function (item) {
    if (item.name == agent_proxy_client) {
        found = true;
        agent_name = item.name;
        agent_instance = item.instance;
        agent_database = item.database;
        agent_url = item.to_device_url;
        agent_to_device_key = item.to_device;
        agent_from_device_key = item.from_device;
    }

});

var prefix_text = "[" + agent_name + "]";

if (found = false) {
    console.log("First parameter is the name of the agent_proxy client, please check configuration/");
    return;
}

var parts = agent_url.split(":");
var http_port = parts[parts.length - 1]; // get last portion of string
// var http_port = port_plus.slice(0, -1); // take off the last slash

var response_template = {
    "agent_id": "some_name",
    "agent_version": "x.y.z",
    "event": "init",
    "payload": {
        "result": "success/fail/other"
    }
}

// simulation support

function suspend_simluation() {

    if (simulation_interval_object != null) {
        console.log(prefix_text, "Device simulation suspend request, but not active");
        clearInterval(simulation_interval_object);
        simulation_interval_object = null;
    } else {
        console.log(prefix_text, "Device simulation suspended");
    }
}

function simulate_device() {

    debug("Entering simulate telemetry...");
    if (simulation_interval_object == null) {
        console.log(prefix_text, "Device simulation start request");
        simulation_interval_object = setInterval(simulation_device_events, sim_interval);
    } else {
        console.log(prefix_text, "Device simulation request ignored, already active");
    }
}

function simulation_device_events() {

    try {
        // loop based on the former tracking data

        debug(prefix_text, "**************** Begin Simulation *************************");

        date = new Date();
        time_ms = date.getTime();

        var new_event = response_template;
        new_event.agent_id = agent_name;
        new_event.agent_version = agent_version;

        var option = simulation_counter % 5;
        new_event.event = "Event ID " + option + " Sim Count " + simulation_counter;
        new_event.payload.result = "success";

        switch (option) {
            case 1:
                new_event.payload['data'] = option;
                break;
            case 2:
                new_event.payload['data'] = option;
                break;
            case 3:
                new_event.payload['data'] = option;
                break;
            case 4:
                new_event.payload['data'] = option;
                break;
            case 0:
                new_event.payload['data'] = option;
                break;
            default:
                new_event.payload['data_default'] = -1;
        }
        
        debug("Submit to the server:", JSON.stringify(new_event, null, 4));

        submit_message_to_agent_proxy(new_event);

        simulation_counter++;
        console.log("Simulation Interval:", simulation_counter, "Simulation offset:", option);
    } catch (error) {
        console.log("Simulation Error:", error);
    }
    debug(prefix_text, "**************** End Simulation *************************");


}

process.on('SIGINT', function () {
    console.log(prefix_text, "Caught interrupt signal");

    clearInterval(simulation_interval_object);
    process.exit();

});


// end simulation support

debug("HTTP Port:", http_port);

var express = require('express'),
    bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json());

function submit_message_to_agent_proxy(json_message) {

    try {
        debug("message to send:", json_message);
        debug("target url:", agent_proxy_endpoint_url);

        var options = {
            uri: agent_proxy_endpoint_url,
            method: 'POST',
            json: json_message,
            headers: {
                'User-Agent': 'node/8.10'
            }
        };

        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("Message submitted successfully:", JSON.stringify(body, null, 4));
            } else {
                console.log("Agent Initialization Error for " + agent_name + ":", error);
            }
        });
    } catch (error) {
        console.log("Submit Message to agent Error for:", error);
    }

}

app.post('/', function (request, response) {
    console.log("post message arrival:", request.body); // your JSON
    var incoming = request.body;

    switch (incoming.event) {
        case "init":

            agent_proxy_endpoint_url = incoming.endpoint_url;
            debug("end point proxy:", agent_proxy_endpoint_url);

            var init_message = response_template;
            init_message.payload.result = "success";
            init_message.agent_id = agent_name;
            init_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(init_message, null, 4));
            console.log(prefix_text, "Incoming Event: Init");

            break;
        case "start":

            var start_message = response_template;
            start_message.payload.result = "success";
            start_message.agent_id = agent_name;
            start_message.agent_version = agent_version;


            response.status(200).send(JSON.stringify(start_message, null, 4));
            console.log(prefix_text, "Incoming Event: Start");
            simulate_device();
            console.log(prefix_text, "Simulation start engaged");

            break;
        case "suspend":

            var suspend_message = response_template;
            suspend_message.payload.result = "success";
            suspend_message.agent_id = agent_name;
            suspend_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(suspend_message, null, 4));
            console.log(prefix_text, "Incoming Event: Suspend");
            suspend_simluation();
            console.log(prefix_text, "Simulation suspend engaged");

            break;
        case "exit":

            var exit_message = response_template;
            exit_message.payload.result = "success";
            exit_message.agent_id = agent_name;
            exit_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(exit_message, null, 4));
            console.log(prefix_text, "Incoming Event: Exit");

            process.exit();

            break;
        default:

    }
});

console.log(prefix_text, "Agent listening on http port:", http_port);
app.listen(http_port);
