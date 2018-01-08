/*

   Agent Proxy Client Example - Olli Control Agent
    
    bojo@premiertechconsultants.com &
    pdykes@us.ibm.com collabortion
    
    mvp5

*/

var config = require('config');

var sim_interval = config.get("agent_proxy.simulation_interval");
var agent_config = config.get("agent_proxy.proxy_list");

var olli_config = agent_config.filter(function (item) {
    return item.name === "olli_control";
});

console.log("Olli Control Agent Config:", JSON.stringify(olli_config[0], null, 4));

console.log("name:", olli_config[0].module_name, olli_config[0].module_Name);

var module_name = olli_config[0].module_name;

var prefix_text = "[" + olli_config[0].module_Name + "]";

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

var request = require('request');

//find out if io is enabled, for non-pi, we will simply simulation
var gpio_enabled = false;
var gpio = null;

var IOModule = {
    RAMP_EXTEND_OUTPUT: {
        value: 0,
        name: "Ramp_Extend_Output",
        pin: 40
    },
    RAMP_RETRACT_OUTPUT: {
        value: 1,
        name: "Ramp_Retract_Output",
        pin: 37
    },
    LIGHTS_OUTPUT: {
        value: 2,
        name: "Lights_Output",
        pin: 38
    },
    QSTRAINT_OUTPUT: {
        value: 3,
        name: "QSTRAINT_Output",
        pin: 35
    },
    QSTRAINT_INPUT: {
        value: 4,
        name: "QSTRAINT_Input",
        pin: 36
    },
}



if (olli_config[0].gpio_enabled) {
    gpio = require('rpi-gpio');
    gpio_enabled = true;
    initialize_io();
    console.log(prefix_text, "Control connection established");
} else {
    console.log(prefix_text, "Simulation established");
}


var found = false;
var listen_here = [];

var agent_name = null;
var agent_instance = null;
var agent_database = null;
var agent_url = null;
var agent_to_device_key = null;
var agent_from_device_key = null;
var agent_version = "0.0.1";
var agent_proxy_endpoint_url = null;

var agent_name = olli_config[0].name;
var agent_instance = olli_config[0].instance;
var agent_database = olli_config[0].database;
var agent_url = olli_config[0].to_device_url;
var agent_to_device_key = olli_config[0].to_device;
var agent_from_device_key = olli_config[0].from_device;
var agent_version = "0.0.1";



debug("IO values:", JSON.stringify(IOModule,null,4));

//flashing lights variables
var flash_timer1;
var flash_timer2;
var flash_sequence = "";
var flash_long_time;
var flash_short_time;
var flash_off_time;

var simulation_active = false;
var simulation_counter = 0;
var simulation_interval_object = null;
var simulation_start_time = 0;
var simulation_location = [];




if (found = false) {
    console.log(prefix_text, "First parameter is the name of the agent_proxy client, please check configuration/");
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

function initialize_io() {
    if (gpio_enabled) {
        try {
            debug("IOModule:", JSON.stringify(IOModule, null, 4));
            gpio.setup(IOModule.RAMP_EXTEND_OUTPUT.pin, gpio.DIR_HIGH, initOutput);
            gpio.setup(IOModule.RAMP_RETRACT_OUTPUT.pin, gpio.DIR_HIGH, initOutput);
            gpio.setup(IOModule.LIGHTS_OUTPUT.pin, gpio.DIR_HIGH, initOutput);
            gpio.setup(IOModule.QSTRAINT_OUTPUT.pin, gpio.DIR_HIGH, initOutput);

            //setup the input
            gpio.on('change', function (channel, value) {
                inputChange(channel, value);
            });
            gpio.setup(IOModule.QSTRAINT_INPUT.pin, gpio.DIR_IN, gpio.EDGE_BOTH);
            debug("Initialize IO Called, function complete.");
            console.log(prefix_text, "Initialize IO Called, function complete");
        } catch (err) {
            debug("Initialize IO Called, error:", err);
            console.log(prefix_text, "Initialize IO Called, error:", err);
        }
    } else {
        debug("Simulation mode:Initialize IO Called, function skipped.");
        console.log(prefix_text, "Simulation mode:Initialize IO Called, function skipped");
    }
}

function initOutput() {};

function writeOutput(pin, state) {
    if (gpio_enabled) {
        gpio.write(pin, state, function (err) {
            if (err) {
                debug("Write output, error:", err);
                console.log(prefix_text, "Write output, error::", err);
                // throw err;  (don't want to risk runtime, we will eat for now)
            } else {
                debug("Production write to Pin:", pin, "State:", state);
                console.log(prefix_text, "Production Mode - write to Pin:", pin, "State:", state);
            }
        });
    } else {
        console.log(prefix_text, "Simulation Mode - write to Pin:", pin, "State:", state);
    }
}

function inputChange(channel, value) {
    if (channel == IOModule.QSTRAINT_INPUT.pin) {
        if (value == false) { //inverted logic false means ON

            var input_event = response_template;
            input_event.agent_id = agent_name;
            input_event.agent_version = agent_version;

            input_event.event = "button_pressed";
            input_event.payload.result = "success";

            debug("Submit to the server:", JSON.stringify(input_event, null, 4));
            submit_message_to_agent_proxy(input_event);
            console.log(prefix_text, "Qstraint Button Pressed");
        }

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
        console.log(prefix_text, "Simulation Interval:", simulation_counter, "Simulation offset:", option);
    } catch (error) {
        console.log(prefix_text, "Simulation Error:", error);
    }
    debug(prefix_text, "**************** End Simulation *************************");


}

process.on('SIGINT', function () {
    console.log(prefix_text, "Caught interrupt signal");

    clearInterval(simulation_interval_object);
    process.exit();

});
// end simulation support



function enable_output(module) {

    debug("Enable Output Module " + module.name);

    writeOutput(module.pin, false); //reverse logic false = on 

}

function disable_output(module) {

    debug("Disable Output Module " + module.name);
    writeOutput(module.pin, true); //reverse logic true = off 

}


//extend_ramp
function extend_ramp(timer) {

    debug("Entering extend_ramp  *****");

    var new_event = response_template;
    new_event.agent_id = agent_name;
    new_event.agent_version = agent_version;

    new_event.event = "extend_ramp";
    new_event.payload.result = "success";

    //first disable the  retract output just in case
    disable_output(IOModule.RAMP_RETRACT_OUTPUT);

    //write the output to extend ramp
    enable_output(IOModule.RAMP_EXTEND_OUTPUT);

    // v should be closed on in the setTimeout
    var v = new Date().getTime()

    //set timer to delay to turn off ramp
    setTimeout(function () {
        debug(prefix_text, "Timer Call Back **** Extend Ramp Completed");
        disable_output(IOModule.RAMP_EXTEND_OUTPUT);
        debug("Submit to the server:", JSON.stringify(new_event, null, 4));
        submit_message_to_agent_proxy(new_event);
        debug(prefix_text, "Timer Call Back **** Extend Ramp Completed");
    }, timer);

    debug("Exiting extend_ramp  *****");

}

//retract_ramp
function retract_ramp(timer) {

    debug("Entering retract_ramp");

    var new_event = response_template;
    new_event.agent_id = agent_name;
    new_event.agent_version = agent_version;

    new_event.event = "retract_ramp";
    new_event.payload.result = "success";

    //first disable the extend output just in case
    disable_output(IOModule.RAMP_EXTEND_OUTPUT);

    //write the output to retract ramp
    enable_output(IOModule.RAMP_RETRACT_OUTPUT);

    //set timer to delay to turn off ramp
    setTimeout(function () {
        disable_output(IOModule.RAMP_RETRACT_OUTPUT);
        debug("Submit to the server:", JSON.stringify(new_event, null, 4));
        submit_message_to_agent_proxy(new_event);
        console.log(prefix_text, "Retract Ramp Completed");
    }, timer);

}

//pulse_qstraint
function pulse_qstraint(timer) {

    debug("Entering pulse_qstraint");

    var new_event = response_template;
    new_event.agent_id = agent_name;
    new_event.agent_version = agent_version;

    new_event.event = "pulse_qstraint";
    new_event.payload.result = "success";

    //write the output to qstraint
    enable_output(IOModule.QSTRAINT_OUTPUT);

    //set timer to delay to turn off ramp
    setTimeout(function () {
        disable_output(IOModule.QSTRAINT_OUTPUT);
        debug("Submit to the server:", JSON.stringify(new_event, null, 4));
        submit_message_to_agent_proxy(new_event);
        console.log(prefix_text, "Pulse QSTRAINT Completed");
    }, timer);
}

//flash_lights
async function flash_lights() {

    debug("Entering flash_lights");
    var new_event = response_template;
    new_event.agent_id = agent_name;
    new_event.agent_version = agent_version;

    new_event.event = "flash_lights";
    new_event.payload.result = "success";


    if (flash_sequence.length > 0) {
        if (flash_sequence.charAt(0) == "-") {
            console.log(prefix_text, "Flash_Lights - Long - ON");
            enable_output(IOModule.LIGHTS_OUTPUT);
            flash_timer1 = setTimeout(function () {
                disable_output(IOModule.LIGHTS_OUTPUT);
                console.log(prefix_text, "Flash_Lights - Long - OFF");
                if (flash_sequence.length > 1) {
                    var new_flash_sequence = flash_sequence.substring(1, flash_sequence.length); //remove one flash char
                    flash_sequence = new_flash_sequence;
                    flash_timer2 = setTimeout(function () {
                        flash_lights()
                    }, flash_off_time);
                } else {
                    debug("Submit to the server:", JSON.stringify(new_event, null, 4));
                    submit_message_to_agent_proxy(new_event);
                    console.log(prefix_text, "Flash_Lights - Completed");
                }
            }, flash_long_time);
        } else {
            console.log(prefix_text, "Flash_Lights - Short - ON");
            enable_output(IOModule.LIGHTS_OUTPUT);
            flash_timer1 = setTimeout(function () {
                disable_output(IOModule.LIGHTS_OUTPUT);
                console.log(prefix_text, "Flash_Lights - Short - OFF");
                if (flash_sequence.length > 1) {
                    flash_sequence = flash_sequence.substring(1, flash_sequence.length); //remove one flash char
                    flash_timer2 = setTimeout(function () {
                        flash_lights()
                    }, flash_off_time);
                } else {
                    debug("Submit to the server:", JSON.stringify(new_event, null, 4));
                    submit_message_to_agent_proxy(new_event);
                    console.log(prefix_text, "Flash_Lights - Completed");
                }

            }, flash_short_time);
        }

    }
}

//lights_on
function lights_on() {

    debug("Entering lights_on");
    //check if running a flashing light sequence and stop the sequence
    clearTimeout(flash_timer1);
    clearTimeout(flash_timer2);
    if (flash_sequence.length > 0)
        flash_sequence = "";

    var new_event = response_template;
    new_event.agent_id = agent_name;
    new_event.agent_version = agent_version;

    new_event.event = "lights_on";
    new_event.payload.result = "success";

    //write the output to lights
    enable_output(IOModule.LIGHTS_OUTPUT);

    debug("Submit to the server:", JSON.stringify(new_event, null, 4));
    submit_message_to_agent_proxy(new_event);
    console.log(prefix_text, "Lights ON Completed");
}

//lights_off
function lights_off() {

    debug("Entering lights_off");

    //check if running a flashing light sequence and stop the sequence
    clearTimeout(flash_timer1);
    clearTimeout(flash_timer2);
    if (flash_sequence.length > 0)
        flash_sequence = "";

    var new_event = response_template;
    new_event.agent_id = agent_name;
    new_event.agent_version = agent_version;

    new_event.event = "lights_off";
    new_event.payload.result = "success";

    //disable the output to lights
    disable_output(IOModule.LIGHTS_OUTPUT);

    debug("Submit to the server:", JSON.stringify(new_event, null, 4));
    submit_message_to_agent_proxy(new_event);
    console.log(prefix_text, "Lights OFF Completed");
}

debug("HTTP Port:", http_port);

var express = require('express'),
    bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json());

function submit_message_to_agent_proxy(json_message) {

    try {
        debug("message to send:", json_message);
        debug("target url:", agent_proxy_endpoint_url);

        if (agent_proxy_endpoint_url == null) {
            // testing code
            console.log(prefix_text, "Error: Agent Proxy is NOT CONFIGURED, useful for test mode only, skipping submit response.  Is Agent Proxy operational?");
            console.log(prefix_text,"Message that would have been sent:", JSON.stringify(json_message, null, 4));
            return;
        }

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
                console.log(prefix_text, "Message submitted successfully:", JSON.stringify(body, null, 4));
            } else {
                console.log(prefix_text, "Agent Initialization Error for " + agent_name + ":", error);
            }
        });
    } catch (error) {
        console.log(prefix_text, "Submit Message to agent Error for:", error);
    }

}

app.post('/', function (request, response) {
    console.log(prefix_text, "Post message arrival:", request.body); // your JSON
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
            // simulate_device();
            console.log(prefix_text, "Simulation start engaged");

            break;
        case "suspend":

            var suspend_message = response_template;
            suspend_message.payload.result = "success";
            suspend_message.agent_id = agent_name;
            suspend_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(suspend_message, null, 4));
            console.log(prefix_text, "Incoming Event: Suspend");
            // suspend_simluation();
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
        case "extend_ramp":

            debug("post *** begin switch extend ramp entry point  ***");

            var extend_message = response_template;
            extend_message.payload.result = "success";
            extend_message.agent_id = agent_name;
            extend_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(extend_message, null, 4));
            console.log(prefix_text, "Incoming Event: Extend Ramp");
            extend_ramp(incoming.payload.timer);
            console.log(prefix_text, "Ramp Extended");

            debug("post *** end switch extend ramp entry point  ***");

            break;
        case "retract_ramp":

            var retract_message = response_template;
            retract_message.payload.result = "success";
            retract_message.agent_id = agent_name;
            retract_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(retract_message, null, 4));
            console.log(prefix_text, "Incoming Event: Retract Ramp");
            retract_ramp(incoming.payload.timer);
            console.log(prefix_text, "Ramp Retracted");

            break;
        case "pulse_qstraint":

            var qstraint_message = response_template;
            qstraint_message.payload.result = "success";
            qstraint_message.agent_id = agent_name;
            qstraint_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(qstraint_message, null, 4));
            console.log(prefix_text, "Incoming Event: Pulse Qstraint");
            pulse_qstraint(incoming.payload.timer);

            break;

        case "flash_lights":

            var flash_lights_message = response_template;
            flash_lights_message.payload.result = "success";
            flash_lights_message.agent_id = agent_name;
            flash_lights_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(flash_lights_message, null, 4));
            console.log(prefix_text, "Incoming Event: Flash Lights");

            flash_sequence = incoming.payload.sequence;
            flash_long_time = incoming.payload.long_time;
            flash_short_time = incoming.payload.short_time;
            flash_off_time = incoming.payload.off_time;

            flash_lights();

            break;
        case "lights_on":

            var lights_on_message = response_template;
            lights_on_message.payload.result = "success";
            lights_on_message.agent_id = agent_name;
            lights_on_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(lights_on_message, null, 4));
            console.log(prefix_text, "Incoming Event: Lights ON");
            lights_on();

            console.log(prefix_text, "Lights ON");

            break;
        case "lights_off":

            var lights_off_message = response_template;
            lights_off_message.payload.result = "success";
            lights_off_message.agent_id = agent_name;
            lights_off_message.agent_version = agent_version;

            response.status(200).send(JSON.stringify(lights_off_message, null, 4));
            console.log(prefix_text, "Incoming Event: Lights OFF");
            lights_off();
            console.log(prefix_text, "Lights OFF");

            break;
        default:
            console.log(prefix_text, "Unknown Request Received");
            response.status(301).send(JSON.stringify('{"unknown":"text"}', null, 4));
    }
});

console.log(prefix_text, "Agent listening on http port:", http_port);
app.listen(http_port);
