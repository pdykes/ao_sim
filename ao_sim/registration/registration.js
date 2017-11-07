var net = require('net');
var fs = require('fs');
var prompt = require('prompt');
var writeJsonFile = require('write-json-file');
var loadJsonFile = require('load-json-file');

var filename = "registration.json";


//  todo
//    support when reader fails, just wiat
//    post items that have happened > 1 second to database
//    create agent that can process this and put a clean version
//     of data


var client = new net.Socket();

var host_ip = '192.168.1.25';
var host_port = '14150';

var current_epc = null;

var persona_template = {
    "persona": "tbd",
    "id": "0",
    "epc": "tbd"
};

var busy = false;

var output_records = [
];

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


client.connect(host_port, host_ip, function () {
    console.log('Connected to speedway [ host:' + host_ip + ', port:' + host_port + ']');
});

client.on('data', function (data) {
    try {
        var parsing_string = data + ''; // convert to a string
        var smartPassRecords = parsing_string.split("\n");

        var date = new Date();
        var offset = date.getTimezoneOffset();
        var newtime = date.getMilliseconds() - offset * 60 * 1000;
        var print_time = Date(newtime).toString();
        // console.log("==============================");
        // console.log("Records recieved:", smartPassRecords.length-1);

        // seems the software has one /n to start, so need to decrement by one
        for (i = 0; i < smartPassRecords.length - 1; i++) {
            // var clean_up = smartPassRecords[i].replace("\n",''); 
            var clean_up = smartPassRecords[i].replace(/(?:\r\n|\r|\n)/g, "");
            // console.log("Input Processing Record: ["+clean_up+"]");
            var json_data = JSON.parse(clean_up);
            // console.log('Received [' + print_time + '][' + i + ']: ' + JSON.stringify(json_data,null,4));
            register_entity(json_data);
        }
    } catch (err) {
        console.log("Error Processing Record: [" + data + "]");
        console.log("Specific Error:", err.message);
    }
    // client.destroy(); // kill client after server's response
});

client.on('close', function () {
    console.log('Connection closed');
});

client.on('error', function(ex) {
  console.log("Issue connecting to the Impinj Reader at IP:[" + host_ip + "] Port:[" + host_port + "], verify is opertional and web console https://<ip address> has been visited to activate the reader.");
  console.log("Exception recieved:",ex);
});


process.on('SIGINT', function () {
    console.log("Caught interrupt signal");
    process.exit();
});


function register_entity(json_data) {

    if (busy == true) {
        return;
    }
    if (json_data.epc !== undefined) {
        if (current_epc == json_data.epc) return;
        busy = true;
        current_epc = json_data.epc;
        console.log("Please enter data for epc:", json_data.epc);
        prompt.start();
        prompt.get(['persona', 'id'], function (err, result) {
            if (err) {
                return onErr(err);
            }
            console.log('Command-line input received (^C to exit and update registration file:');
            console.log('  Persona: ' + result.persona);
            console.log('  Id: ' + result.id);

            // new_record = persona_template;
            // new_record.persona = result.persona;
            // new_record.id = result.id;
            // new_record.epc = json_data.epc;
            // output_records.push(new_record);
            var json_content = null;
            var records = null;;
            fs.readFile(filename, 'utf8', function (err, records) {

                var jsonobj = JSON.parse(records);

                // console.log("Parsed Json:", JSON.stringify(jsonobj,null,4));

                // for (var i=0; i < jsonobj.length; i++) {
                //     console.log("Added:[" + i + "]",JSON.stringify(jsonobj[i],null,4));
                // }                

                var persona = result.persona;
                var id = result.id;
                var epc = json_data.epc;

                var found = false;

                for (var i = 0;
                    ((i < jsonobj.length) && (found == false)); i++) {
                    if (jsonobj[i].persona == "init") {
                        // console.log("Output records:[" + i + "]", JSON.stringify(jsonobj[i], null, 4));
                    } else {
                        if (jsonobj[i].epc == epc) {
                            found = true;
                            console.log("************* Data Entry Error *************************");
                            console.log("Error: Repeat SmartPass ID entry. SmartPass ID Duplicate record to :", JSON.stringify(jsonobj[i], null, 4));
                            console.log("************* Data Entry Error *************************");
                        }
                        if ((jsonobj[i].persona == persona) && (jsonobj[i].id == id)) {
                            found = true;
                            console.log("************* Data Entry Error *************************");
                            console.log("Error: Repeat Personaentry. Peronsa a duplicate record to :", JSON.stringify(jsonobj[i], null, 4));
                            console.log("************* Data Entry Error *************************");
                        }

                    }
                }

                console.log("");
                
                if (found == false) {
                    jsonobj.push({
                        persona: persona,
                        id: id,
                        epc: epc
                    });
                }

                writeJsonFile(filename, jsonobj).then(() => {

                    for (var i = 0; i < jsonobj.length; i++) {
                        if (jsonobj[i].persona != "init") {
                            console.log("Current registation records:[" + i + "]", JSON.stringify(jsonobj[i], null, 4));
                        }
                    }
                    console.log('Verified Registration File(^c to exit):', filename);
                });
            });
        });
    }
    busy = false;
}
