const AV = require('av-js');
var async = require('async');

var module_name = "hermes_adapter";
var text_prefix = "Hermes Adapter: ";

var debug = require("debug")(module_name);
debug("Debug enabled in module: %s", module_name);

var vehicle_ids = [];
var vehicles = []
var keepalive_frequency = 3000
var hermes_config = { host: "localhost", port: "40000" }

function onSupervisorMessageReceived(msg) {
    debug(text_prefix, "Received ", msg)
    debug(text_prefix, "Replying with a Command Success.")
    this.commandSuccess(msg.commandId, msg.vehicleCommand.vehicleId.value)
}

function create_and_announce_vehicle(vehicle_id, callback) {
    console.log(text_prefix, "Connecting and announcing vehicle "+ vehicle_id)
    var av = new AV.constructor()
    av.setOnReceived(onSupervisorMessageReceived.bind(av))
    av.connect(hermes_config).then(function() {
        av.announce(vehicle_id)
        if (typeof callback === "function") callback()
    })
    return av
}

function randomInRange(min, max) {
    return Math.random() * (max-min) + min;
}

function register_vehicles(callback) {
    console.log(text_prefix, "Registering vehicles.")
    async.each(vehicle_ids, (vehicle_id, cb) => {
        vehicles[vehicle_id] = create_and_announce_vehicle(vehicle_id,cb)
        // fake the battery
        vehicles[vehicle_id].battery = randomInRange(0.5, 1.0)
    }, function() {
        console.log(text_prefix,"All vehicles registered.")
        if (typeof callback === "function") callback()
    });
}

function disconnect_vehicles() {
    async.each(vehicle_ids, vehicle_id => {
        if(vehicles[vehicle_id].ready)
        {
            console.log(text_prefix, "Disconnecting vehicle "+ vehicle_id)
            vehicles[vehicle_id].disconnect().then(function() {
                console.log(text_prefix, "Vehicle "+ vehicle_id + " disconnected.")
            })
        }
    }, function() {
        console.log(text_prefix,"All vehicles disconnected.")
        vehicles = []
    })
}

exports.process_trip_end_event = function(trip_end_event) {
    debug(text_prefix, "Incoming:", JSON.stringify(trip_end_event, null, 4));
    console.log(text_prefix, "Trip end. Sending Mission Complete.")
    vehicles[vehicle_ids[0]].missionComplete(vehicle_ids[0])
}

exports.process_telemetry_transition = function(telemetry_transition) {
    if(!telemetry_transition.transport_data || !telemetry_transition.transport_data.olli_vehicles){
        console.error(text_prefix, "Corrupted telemetry_transition received:", JSON.stringify(telemetry_transition, null, 2))
        return
    }
    const vehicles_telemetry = telemetry_transition.transport_data.olli_vehicles
    for (olli_name in vehicles_telemetry) {
        geo_position_event = vehicles_telemetry[olli_name]
        geo_position_event.asset = olli_name; // set the vehicle ID in the 'asset' field
        process_geo_position_event(geo_position_event);
    }
}

exports.process_emergency_active_event = function(emergency_active_event) {
    debug(text_prefix, "Incoming:", JSON.stringify(emergency_active_event, null, 4));
    console.log(text_prefix, "Emergency stop activated. Updating vehicle state.")
    vehicles[vehicle_ids[0]].setEmergencyState("active")
}

exports.process_emergency_released_event = function(emergency_released_event) {
    debug(text_prefix, "Incoming:", JSON.stringify(emergency_released_event, null, 4));
    console.log(text_prefix, "Emergency stop released. Updating vehicle state.")
    vehicles[vehicle_ids[0]].setEmergencyState("resume")
}

function computeSpeed(oldLatLng, newLatLng, oldTimestamp, newTimestamp) {
    const deltaTimeSeconds = Math.max(0, newTimestamp - oldTimestamp)/1000
    if(!oldLatLng || !oldTimestamp || deltaTimeSeconds == 0) return 0
    else {
        const deltaDistanceMeters = Math.sqrt(Math.pow((newLatLng[0] - oldLatLng[0])*100000,2) + Math.pow((newLatLng[1] - oldLatLng[1])*100000, 2))
        const speedInMps = Math.min(12, deltaDistanceMeters/deltaTimeSeconds)
        return speedInMps
    }
}

function process_geo_position_event(geo_position_event) {
    const vehicle_id = geo_position_event.asset
    if(vehicle_ids.includes(vehicle_id)) {
        debug(text_prefix, "Incoming:", JSON.stringify(geo_position_event, null, 4));
        var bearing = Math.PI*((-geo_position_event.properties.heading-90))/180
        const lat = geo_position_event.geometry.coordinates[1]
        const lng = geo_position_event.geometry.coordinates[0]
        const newLatLng = [lat, lng]
        const newTime = Date.now() //geo_position_event.properties.timestamp
        if(vehicles[vehicle_id].ready) {
            const lastTime = vehicles[vehicle_id].lastTime || 0
            if(Math.abs(newTime - lastTime) < 50) { // ignoring duplicated updates in time interval of less than 50 ms
                debug(text_prefix, "Ignoring update for vehicle '"+vehicle_id+"' because it's too recent.", Math.abs(newTime - vehicles[vehicle_id].lastTime));
            }
            else {
                // compute speed
                const speed = computeSpeed(vehicles[vehicle_id].latLng, newLatLng, lastTime, newTime)
                // save coordinates
                vehicles[vehicle_id].latLng = newLatLng
                // save new timestamp as last timestamp
                vehicles[vehicle_id].lastTime = newTime
                // save speed
                vehicles[vehicle_id].speed = speed
            }

            console.log(text_prefix, "Moving vehicle '"+vehicle_id+"' to: ", newLatLng, 4326, bearing)
            vehicles[vehicle_id].moveTo([lat, lng], 4326, bearing, vehicles[vehicle_id].battery || 1, vehicles[vehicle_id].speed || 0)
        }
        else {
            console.log(text_prefix, "Cannot move vehicle '"+vehicle_id+"' to: ",[lat, lng], ". Vehicle is not ready. ")
        }
    } else {
        debug(text_prefix, "Ignoring event related to unregistered vehicle '"+vehicle_id+"'.");
    }
}

function send_echo_request() {
    async.each(vehicle_ids, vehicle_id => {
        if(vehicles[vehicle_id].ready){
            console.log(text_prefix, "Sending ECHO request from vehicle ", vehicle_id)
            vehicles[vehicle_id].echo()
        }
    })
}

function init_keepalive() {
    console.log(text_prefix,"Start ECHO keep-alive routine.")
    setInterval(send_echo_request, keepalive_frequency);
}

function resume_emergency_states() {
    async.each(vehicle_ids, vehicle_id => {
        if(vehicles[vehicle_id].ready){
            vehicles[vehicle_id].setEmergencyState("resume")
        }
    })
}

exports.start = function(vehicleIDs, hermesConfig, keepalive) {
    vehicle_ids = vehicleIDs || vehicle_ids;
    console.log(text_prefix, "Vehicles:", vehicle_ids);
    hermes_config = hermesConfig || hermes_config;
    console.log(text_prefix, "Core Engine Hermes address:", hermes_config);
    keepalive_frequency = keepalive || keepalive_frequency;
    console.log(text_prefix, "Keepalive ECHO requests frequency (ms):", keepalive_frequency);

    register_vehicles(function() {
        init_keepalive()
        resume_emergency_states()
    })
}

exports.stop = function() {
    console.log(text_prefix, "Disconnecting vehicles.");
    disconnect_vehicles()
}
