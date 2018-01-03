# mvp4d - Welcome!


Mvp4 Changes

(mvp4d)

  - Awareness - to generate real-time events, the event_manager agent needs 
    to operation listen to telemetry agent, then the rule_event_transitions
    data will be pushed.
    
  - olli_audio_agent is now operational (./olli_audio_agent)
    - Acquire the Watson/IBM Cloud username and password from Box
    - The concept of an audio zone is supported, and we have four zones
      currently
      - all (plays in each of the audio agents, more than one is supported)
      - olli_stop  (public address in olli stop)
      - olli_stop_kiosk (entry kiosk/monitor 1)  olli stop (still ensuring this supports audio)
      - olli_1  (public address in the olli for CES)
      
      - Established an audio zone is specified in the default.json in
        ../config tree for example see the audio_zone value:
        
```        
        "olli_audio_agent": {
            "module_name": "olli_audio_agent",
            "module_Name": "Olli Audio Agent",
            "database": "audio_events",
            "watson_url": "https://stream.watsonplatform.net/text-to-speech/api",
            "watson_username": "get username value from mvp4 box directory",
            "watson_password": "get password value from mvp4 box directory", 
            "audio_zone" : "all",
            "retain_audio_artifacts" : "false"
        }, 
```
      - Any olli_audio_agent started and configured to point to this
        configuration directory, with this default.json would play
        all audio events (great for testing, debugging, etc...)
      - Set the vaue to something else (support items above), and only
        events targeted to that audio zone will play in that agent
        instance
      - Example Audio Events
      
      - Play a welcome to CES message via all agents (assume agents
        are in olli, stop and on olli_stop entry kiosk (this is a 
        simulation time based event in ../config/simulation_time_events.json)
        
```
    "simulation_record_1000": {
        "simulation_time": 1000,
        "events": [
            {
                "name": "audio_welcome_to_olli_1",
                "event": "audio_welcome_to_olli_1",
                "payload": {
                    "type": "audio",
                    "text": "Welcome! Thank you for visiting the 2018 C E S Accessible Olli Exhibit. We are glad you are here!",
                    "audio_zone": "all",
                    "accept": "audio/mp3",
                    "tag": "Audio_Welcome_to_Olli",
                    "local": "welcome_olli.m4a",
                    "parameters": "e1;e2;e3..."
                }
		    }
	     ]
    },

```
  - Play this snippet only at that olli_stop_kiosk:
  
```
    "simulation_record_2000": {
        "simulation_time": 3000,
        "events": [
            {
                "name": "test_audio_welcome_to_olli_1_olli_stop_kiosk",
                "event": "test_audio_welcome_to_olli_1_olli_stop_kiosk",
                "payload": {
                    "type": "audio",
                    "text": "Welcome to the 2018 CES Accessible Olli Stop Entry Kiosk.",
                    "audio_zone": "olli_stop_kiosk",
                    "accept": "audio/mp3",
                    "tag": "Audio_Welcome_to_Olli",
                    "local": "welcome_olli.m4a",
                    "parameters": "e1;e2;e3..."
                }
		    }
        ]
    },
```  
  - Play this this snippet only on the Olli as we reach the point
    to enable the emergency stop (note this is in the ../config/telemetry_offset_events.json file):
```
    "offset_record_69": {
        "offset": 69,
        "events": [
            {
                "name": "audio_olli_1_enable_emergency_stop_window_start",
                "filter": "olli_1",
                "event": "audio_olli_1_enable_emergency_stop_window_start",
                "payload": {
                    "type": "audio",
                    "text": "replace patrons can now initiate the emergency stop demonstration.",
                    "accept": "audio/mp3",
                    "audio_zone" :  "olli_1",
                    "tag": "audio_olli_1_emergency_stop",
                    "local": "welcome_olli.m4a",
                    "parameters": "replace_vehicle_name"
                }
		    }
        ]
    },

```
  - Note the example above allows the _vehcile attribute in the event
    to override or be "replaced" in the audio text.  Useful for
    events that should be stated in each specific vehicle.
  
  
- Earlier mvp4 changes    
  

  - Key change, the rule_events database has been renamed to
    rule_event_transitions due to required wildcarding for
    event manager.  If you use the config (config/default.config)
    should not be much of an issue.
  - olli_audio_agent added
    - Watson text to speach is now integrated
    - configugration in box, normal spot in mvp4/
    - these events can be add in either the simulation
      or the telemetry rules (see config)
    - the tagging and local file support is pending,
      target mvp4b
    - simulation example:
```
            {
                "name": "audio_welcome_to_olli_1",
                "event": "audio_welcome_to_olli_1",
                "payload": {
                    "action": "play",
                    "type": "audio",
                    "text": "Welcome to the 2018 Accessible Olli Exhibit, provided by CTA, IBM, Local Motors and other partners.",
                    "accept": "audio/mp3",
                    "audio_target" : "olli_1 or stop_1",
                    "tag" : "Audio_Welcome_to_Olli",
                    "local" : "welcome_olli.m4a",
                    "parameters": "e1;e2;e3..."
                }
		    }

```
    - telemetry Watson text to speech example (note event same as above)
```
            {
                "name": "audio_awareness_appraoching_stop_4",
                "filter": "olli_1",
                "event": "audio_awareness_appraoching_stop_4",
                "payload": {
                    "action": "play",
                    "type": "audio",
                    "text": "Olli is approaching Discovery Square, Stop 4.",
                    "accept": "audio/mp3",
                    "tag": "audio_approaching_stop_4",
                    "local": "welcome_olli.m4a",
                    "parameters": "y1;y2;y3..."
                }
		    }
```
    
  - persona data improvements
    - phone and cuisine added, e.g.:
    
```
            body: {
                "_id": "Erich:41",
                "_rev": "57-4583d43da4761a690a001087a41157c0",
                "persona": "Erich",
                "persona_id": "41",
                "transition": "olli_stop_end_exit",
                "preferences": {
                    "mobile_phone": "507-234-4234",
                    "cuisine": "Italian"
                },
                "time": 1514754156320,
                "delta_time": 3039,
                "location": "olli_stop",
                "old_location": "exhibit",
                "smartpass_id": "000000000000000052313155"
            }
```
    
  - event manager
     - more standard attributes to be used for context
     - events initiated from simulation rules
       (payload attributes beginning with "_")
```
        {
          "_id": "audio_welcome_to_olli_1:0fc11bd4-0796-4383-aa42-aafdb4e72e0e:1514755244315",
          "_rev": "1-cecc8a44f62cd000933f8a478a3f5484",
          "event": "audio_welcome_to_olli_1",
          "payload": {
            "action": "play",
            "type": "audio",
            "text": "Welcome to the 2018 Accessible Olli Exhibit, provided by CTA, IBM, Local Motors and other partners.",
            "accept": "audio/mp3",
            "audio_target": "olli_1 or stop_1",
            "tag": "Audio_Welcome_to_Olli",
            "local": "welcome_olli.m4a",
            "parameters": "e1;e2;e3...",
            "_event_type": "simulation_rule_event",
            "_simulation_real_time": 1514755244315,
            "_simulation_delta_time": 1000
          }
        }

```
   - event intiated from telemetry rules
   
```
        {
          "_id": "audio_olli_1_has_arrived_mayo_gonda_stop_5:e1c993c4-3af0-47d3-a71b-7eca06d27071:1507493012000",
          "_rev": "1-048714e07f81cbed1c0ae24a35665cf9",
          "event": "audio_olli_1_has_arrived_mayo_gonda_stop_5",
          "payload": {
            "action": "play",
            "type": "audio",
            "text": "Olli 1 has arrived at Mayo Gonda, Stop 1.",
            "accept": "audio/mp3",
            "tag": "audio_olli_1_stop_5",
            "local": "welcome_olli.m4a",
            "parameters": "y1;y2;y3...",
            "_vehicle": "olli_1",
            "_offset": 211,
            "_simulation_delta_time": 106000,
            "_simulation_real_time": 1514755349453,
            "_event_type": "telemetry_rule_event"
          }
        }
```

     
  - ces_control_agent
     - new agent that implements items specifcially for
       CES (maybe others, but leverages ao_sim work)
     - this will be leveraged more in mvp4b
     
  - fixed a bug I introduced into bestmile ;-) after overwirting something (yea, it was late)
  - event manager is close to supporting
     - clearly state beginning and end of each iteration of simulation
     - continuous running mode enabled (mvp4c to engage fully, especially for long running test)
     - support for continuous but also stopping sim and stop 4 and stop 1 for show staff to re-engage
     
  - ces event manager start in place
     - will be anchor for ramp and emergency stop
     
     
  - ao_sim now offers a web interface if command line getting you down ;-)
    - only simulation control support thus far
    - to operate
        - cd cmdline/
        - export AOCLI_SERVICE=true
        - node ao.js
        - using browser, visit:  http://localhost:3007/
        - Only the simulation control section (option 1 is operational)
        - Focus on Initiate Simulation to kick off telemetry, otherwize
          the command line, will flush out web function in future drops


Mvp3 Changes

  - Event Manager (rule agent) added:
    - Simple model to script what should occur based on various input events
    - mvp3 focus is driving events based on simulation time and olli movement
    - Each start and stop now support via events (see slack for more info), an example:

```
        {
          "_id": "Trip Start:3bfa51e6-2234-4fb3-9b8d-4d8623d8fff9:1507493012500",
          "_rev": "1-d44f5c8b701c5e907abcf9dd2aa744ba",
          "event": "Leaving Mayo Gonda (Stop 1)",
          "payload": {
            "type": "event_data",
            "state": "stop_4_departure",
            "at_stop": "stop_1",
            "previous_stop": "stop_5",
            "next_stop": "stop_2",
            "_vehicle": "olli_1",
            "_offset": 212
          }
        }
```

  - To use
      - cd event_manager
      - npm install
      - node app.js

    (telemetry agent ( ../telemetry needs to ran currently to enable events))

  - Developers can "follow" the rules_events database to receive
    real-time changes the simulation entities drive related to rules
    
  
  - Setup directory added, easier to configure couchdb intially and for ongoing usage

      - install couchdb (couchdb.apache.org)
      - cd setup
      - npm install -g couchshell
      - cat database.lst
      - execute the commands to ensure you have all the databases created correctly
        - couchshell 
           - enter each of the commands
           
      - For docs, access iva the web, use "npm couchshell" to link to docs, nice tool,
        once you start using, it will save a great deal of time
        
      - mvp4 will autmoated the startup and operation of the demo suite, stay tuned

  - Bestmile integration
     cd bestmile
     node app.js
     (see readme to setup, bit more complicated and has external dependencies)

  - Basic Kintrans integration
  
     - Before Kintrans native on windows 2000 runs, this little app
       server must be ran (cd dir, node app.js)
      
     - Configure tool to use that url (see ../kintrans/ for more detail)
             
 
Key things to notice:

 - telemetry.json (updated, still separate)

    - in box mvp4 directory (same as mvp2 version)

 - ../config/ now has rule files

    - these rules alow the telemetry agent to issue events and fire to other agents
      for processing

 - graphic agents now listen to the eventing (some coming soon), these agents will 
   show and hide UE components

   - these components will listen to the real-time eventing and then display
      - urls, videos, images and text/factoids
   - https://github.com/pwcremin/olli
   - https://github.com/AccessibleOlli/olli-stop
   - https://github.com/AccessibleOlli/ces-stop-arrivals
      (web) https://accessibleolli.github.io/ces-stop-arrivals/
      
   - we will try to bring all this together when the rush is a bit behind us

 - other related repositories
    
 - for best mile, to view the live telemetry  the url is:

    https://accessibleolli.env.partners.bestmile.io/sites/rochester/control-center
    (user id/pwd required see readme in bestmile/)

 - The format of the new events look like this:

    - _id is the rule that fired (telemetry or simulation), uuid and time event occurs in ms since epoch
    - (required to be provided) event is the rule that fired, you can make as easy to parse as needed
    - (required to be provided) name of the event (can be a bit more friendly)
    - payload is the body of the event
    - for example:
    
```
 {
  "_id": "another_event_name_at_simtime_0:c4ee6581-3a29-4814-ac46-813ff94d7bb7:1513659469435",
  "_rev": "1-871fd763a835ddf3209551324ae5e3ab",
  "event": "another_event_at_simtime_0",
  "payload": {
    "element1": "this_data_element",
    "element2": "5"
  }
}
```
             
Currently inflight functions targeted for mpv4:

    - audio agent serving up Watson, and will fallback to recordings, need to account for stop and 
    olli physical deploy) (first version complete, device specific work next)
    - olli ramp deploy agent (ces_control_agent a start)
    - olli emergency stop agent (ces_control_agent a start)
    - integrate detailed, per simulation time and event offset graphics and visual experience
    - control to initiate actual ramp deploy and retraction, separate tool
    - Kintrans avatar
    - persona specific (e.g. kathyrn XX phone number, food choice, and whatever, let me know) [done]
    - please drop requirements for critical needed functions
    - automated startup and operation [ao_cli has a start]

Enabling debugging

    - need more data without reading the code?
    - for all node apps, if you want more detail
    - cd <directory>
    - export DEBUG=<component name>
    - The component name is usually in the top of the source file, or enumerated in ../config/default.json


# Lets get the simulation and replication code downloaded, and run in a few docker containers optionally  ;-)

   - configuration setup
      The new configuration solution relies on environment variables, and offers many advantages, see the articles at this link for more information https://www.npmjs.com/package/config
      

   - prereqs
      - download and install node (version 6-8 is fine), git and docker community edition (ce) (docker is NOT required)
      
      
      - for those new to the common configuration and node, nearly every node component/solution requires this to be done
      - before running below:
      
          - move to the directory of choice
            - cd <component>
          - set the config env variable
            - export NODE_CONFIG_DIR=../config   (macos)
            - set NODE_CONFIG_DIR=..\config      (windows)
          - install the node dependencies
            - npm install                        (some folks use yarn, your call, NOT TESTED)
      
   - docker config (optional!)      
     - Docker is not required, and sometimes makes the solution  more complicated... However if you love
       Docker, have fun.

      ensure you have a shared directory on the host which Docker can read 
      
      (for mac open docker, shares /Users by default, other os vary)
      
# More general information

   - there are many videos to get folks started on this, check in box under the mvp2/ path...
     - architecture
     - approach
     - techniques
     - agents, agent_proxy
     
     
   - Common problems running the command line
    
     - Are you in the correct directory?
     
       cd ../cmdline
     
       (if you do an ls or dir, you should see ao.js in the directory)
       
     - Is the configuration environment variable value directory set?
     
       export NODE_CONFIG_DIR=../config          (linux, macos)
       set NODE_CONFIG_DIR=..\config             (windows)
       
     - Two dashes... node and general command line tools like two dashes
     
        node ao.js --control telemetry --operation enable
        
     - Did you skip ahead and not create the database tables, tisk, tisk, tisk
    
        For this case, see the setup directory (../setup)
   
# Download the code from github, and (optionally) a container


Current Instructions

Set the centralized configuration attributes

- MacOS example (use your OS's approach to setting environment variables), open a shell, command (reference should be relative to the mvp2/config root directory):

```
export NODE_CONFIG_DIR=../config      (macos/linux)
set NODE_CONFIG_DIR=..\config         (windows)
```

Command line tooling walk through
   
```
 $ = host/mac shell command  # = docker image shell command
```

 Create a docker(optional)/node directory somewhere, then:

```
 $ cd temp/ao_work
 $ git clone https://github.com/pdykes/ao_sim 
 $ cd ao_sim 
 $ pwd
 /Users/pdykes@us.ibm.com/temp/ao_work/ao_sim
```

Configuration the database

Install couchdb, and setup *table names have changed and it matters*:

 - To install via web, visit couchdb.apache.org, download appropriate version for you
 - See the ../setup for the database list and a tool to make your
   life easier to install (couchshell)
 - Create an admin (use Web UI for Couchdb, lower left hand corner, admin/admin)
    http://127.0.0.1:5984/_utils/#login   (common default unless you changed it ;-) )

 
pwd output value => show you where the code has been placed, denote that location as used several times below.

Call this directory the target_directory


At this points there is two paths, one is simpler than other, but the container path will be what we get into
as the solution begins to grow.

## Simple test

Utilzing local shells and cloudant (docker image of cloudant (below ok as well))

1. For local install, install Nodejs... visit nodejs.org, and install the current LTS for your system.

   - After installing, open a shell window, and issue:
   ```
   node -v
   ```
   You should should see a version number, otherwise, reinstall and start a new window again after that. 

   b) Install couchdb from couchdb.apache.org, tested with 2.1+ version
   (You could use the couchdb docker image below... vs. install the application, see details to make it visible)
   - Start the application
   - Access the web console, default usually http://127.0.0.1:5984
   - Create the database "persona_transitions"

2. Open two shells
   - cd (target_directory)/monitor
   - In one of the windows:
   ```
   ls -al
   ```

   - You should see files such as "monitor.js", etc... if not, repeat the git clone steps above.
   - If so, you need to install the node dependences:

   ```
   npm install
   ```

   - This should run for 1-3 minutes.

3. Enable the kiosk
   - In one of the shell windows, issue: "node kiosk_stub.js"

     (if the url above step 1 is different, use "node kiosk_stub.js url <http://127.0.0.1:5984>") 

4. With the database and the replication monitor operational, time to send some simulated data through.
   - In the remaining shell window, issue: "node monitor.js"

     (if the url changes use "node monitor.js -d <http://127.0.0.1:5984>") 

Other information
1. node monitor.js -h : prints out help text (the monitor actually reads RFID tags and reports)
2. The detailed output for the commands, enabling debugging and other items are in the detail below.

## Setting up telemetry, agent_proxy, agents, persona_locataions, etc...

Configuration

 - Please ensure you set the NODE_CONFIG_DIR value, e.g. 
 
```
export NODE_CONFIG_DIR=../config
```

Intro video

 - This file is a quick time video, about 22 minutes (The file is pretty large, will try to fix that for the next drop)
 - Link: https://ibm.box.com/s/u0dsmno6cir5fzvors0qalj937sl6ekt
 - Note, the pathing was simplified after the first video was cut
 
Startup Sequence

While some of the components can be started without regards to order, this section spells out which to start.  Once started, many of the elements can be started over and over again without issue.

1. Start the database (For local host usually located at http://127.0.0.1:5894).

2. Agents, cd into the generic_agent directory, example start sequence (note, init portion will not display until step 3.)

```
> node app.js kintrans_01
```

```
[kintrans_01] Agent listening on http port: 3004
post message arrival: { event: 'init',
  agent_id: 'kintrans_01',
  agent_instance: '01',
  endpoint_url: 'http://127.0.0.1:3002' }
[kintrans_01] Incoming Event: Init
```

```
> node app.js ultrahaptics_01
```

```
[ultrahaptics_01] Agent listening on http port: 3003
post message arrival: { event: 'init',
  agent_id: 'ultrahaptics_01',
  agent_instance: '01',
  endpoint_url: 'http://127.0.0.1:3002' }
[ultrahaptics_01] Incoming Event: Init
```

```
> node app.js kintrans_02
```

```
[kintrans_02] Agent listening on http port: 3005
post message arrival: { event: 'init',
  agent_id: 'kintrans_02',
  agent_instance: '02',
  endpoint_url: 'http://127.0.0.1:3002' }
[kintrans_02] Incoming Event: Init
```

3. Start the agent proxy, cd agent_proxy

```
> node app.js
```

```
[Proxy Agent] Initializing: ultrahaptics_01
[Proxy Agent] Listener Target: http://127.0.0.1:5984/ultrahaptics_01
[Proxy Agent] Initializing: kintrans_01
[Proxy Agent] Listener Target: http://127.0.0.1:5984/kintrans_01
[Proxy Agent] Initializing: kintrans_02
[Proxy Agent] Listener Target: http://127.0.0.1:5984/kintrans_02
[Proxy Agent] Agent listening on http port: 3002
```

4. Setup the command line to follow each of the databases.  The database instances must be created prior to using the command line tool.

```
> node ao.js --follow kintrans_02

```

```
[#AO_cli] Action: kintrans_02 Target: http://127.0.0.1:5984/kintrans_02
[#AO_cli] Ctrl-C to exit in follow mode
```

```
> node ao.js --follow kintrans_01
```

```
[#AO_cli] Action: kintrans_01 Target: http://127.0.0.1:5984/kintrans_01
[#AO_cli] Ctrl-C to exit in follow mode
```

```
> node ao.js --follow ultrahaptics_01
```

```
[#AO_cli] Action: ultrahaptics_01 Target: http://127.0.0.1:5984/ultrahaptics_01
[#AO_cli] Ctrl-C to exit in follow mode
```

```
> node ao.js --follow patrons
```

```
[#AO_cli] Action: patrons Target: http://127.0.0.1:5984/persona_transitions
[#AO_cli] Ctrl-C to exit in follow mode
```

```
> node ao.js --follow telemetry
```

```
[#AO_cli] Action: telemetry Target: http://127.0.0.1:5984/telemetry_transitions
[#AO_cli] Ctrl-C to exit in follow mode
```

```
> node ao.js --follow patron_locations
```

```
[#AO_cli] Action: patron_locations Target: http://127.0.0.1:5984/patron_locations
[#AO_cli] Ctrl-C to exit in follow mode

```

Note to get a feel for the JSON messages, you can look at the various change records emitted by these tools, use the change.doc avlue.

5. Patron Manager Service

```
> node app.js
```

```
Listener target: http://127.0.0.1:5984/persona_transitions
```

6. Telemtry Service

```
> node telemetry.js
```

```
[Telemetry Agent] Initialization...
[Telemetry Agent] Route Description: red_route
[Telemetry Agent] Monitoring specific events can be enable via ao_cli or by enabling debug
```

7. Persona Monitor Service

```
> node monitor.js
```

```
SmartPass: Registation records:[1] { Kathryn:40 SmartPass Id[E280116060000209597B5241] }
SmartPass: Registation records:[2] { Kathryn:02 SmartPass Id[000221550000000000000461] }
SmartPass: Registation records:[3] { Erich:41 SmartPass Id[000000000000000052313155] }
SmartPass: Registation records:[4] { Brent:04 SmartPass Id[000221550000000000000464] }
SmartPass: Registation records:[5] { Brent:20 SmartPass Id[000221550000000000000465] }
SmartPass: Registation records:[6] { Erich:27 SmartPass Id[000221252000000000000254] }
SmartPass: Registation records:[7] { Brent:34 SmartPass Id[300833B2DDD9014000000000] }
SmartPass: Registation records:[8] { Grace:07 SmartPass Id[E280116060000209597B5202] }
SmartPass: Registation records:[9] { Grace:30 SmartPass Id[E280116060000209597B4862] }
SmartPass: Registration File Loaded: registration.json
SmartPass: Location records:[0] { 1:registration] }
SmartPass: Location records:[1] { 2:olli_stop_entry] }
SmartPass: Location records:[2] { 3:olli_stop_side_exit] }
SmartPass: Location records:[3] { 4:olli_stop_end_exit] }
SmartPass: Location records:[4] { 5:olli_roller] }
SmartPass: Simulation start time established
SmartPass: Persona: Erich:41 Location: olli_stop Transistion: olli_stop_end_exit Simulation Time: 1512361886487
```

8. Control commands, use the command line tool to not only follow, but use enable, disable, start, suspend, etc...

Start the Telemetry 

```
> node ao.js --control telemetry --operation enable
```

```
[#AO_cli] Successful operation set telemetry_control in database telemetry_transitions now set to enable state
```

The telemetry monitorng will wake up:

```
> node telemetry.js
```

```
[Telemetry Agent] Initialization...
[Telemetry Agent] Route Description: red_route
[Telemetry Agent] Monitoring specific events can be enable via ao_cli or by enabling debug
[Telemetry Agent] Receiving updated record from: http://127.0.0.1:5984/telemetry_transitions
[Telemetry Agent] Control mode change request arrived: enabled
[Telemetry Agent] Control Mode enabled
[Telemetry Agent] Simulation start time established
[Telemetry Agent] Simulation start request
[Telemetry Agent] Simulation start request initiated
[Telemetry Agent] Receiving updated record from: http://127.0.0.1:5984/telemetry_transitions
[Telemetry Agent] Transport transition Delta Time: 0
[Telemetry Agent] Receiving updated record from: http://127.0.0.1:5984/telemetry_transitions
[Telemetry Agent] Transport transition Delta Time: 1000
[Telemetry Agent] Receiving updated record from: http://127.0.0.1:5984/telemetry_transitions
[Telemetry Agent] Transport transition Delta Time: 1500
[Telemetry Agent] Receiving updated record from: http://127.0.0.1:5984/telemetry_transitions
[Telemetry Agent] Transport transition Delta Time: 2000

```

9. Disable Telemetry Service Example

```
> node ao.js --control telemetry --operation disable
```

```
[#AO_cli] Successful operation set telemetry_control in database telemetry_transitions now set to disable state
```

Telementry Service Monitor will look something like this

```
[Telemetry Agent] Receiving updated record from: http://127.0.0.1:5984/telemetry_transitions
[Telemetry Agent] Transport transition Delta Time: 31500
[Telemetry Agent] Receiving updated record from: http://127.0.0.1:5984/telemetry_transitions
[Telemetry Agent] Control mode change request arrived: disabled
[Telemetry Agent] Control Mode disabled
[Telemetry Agent] Suspending in progress simulation, renable to start
[Telemetry Agent] Simulation Suspended
```

10. You can start the other agents similarly. More advanced state change support if agent supports

For agents specifically:

```
> node ao.js --control kintrans_01 --operation start
> node ao.js --control kintrans_01 --operation suspend
> node ao.js --control kintrans_01 --operation exit
```

11. Starting the Event Manager

```
(cd event_manager)
> node app.js
```

Then, (based on your rules) the following should appear

```
[Event Manager] Processing key simulation_record_1000
[Event Manager] Processing key simulation_record_2000
[Event Manager] Processing key offset_record_5
[Event Manager] Processing key offset_record_10
[Event Manager] Processing key offset_record_19
[Event Manager] Processing key offset_record_20
[Event Manager] Processing key offset_record_68
[Event Manager] Processing key offset_record_69
[Event Manager] Processing key offset_record_211
[Event Manager] Processing key offset_record_212
[Event Manager] Processing key offset_record_427
[Event Manager] Processing key offset_record_428
[Event Manager] Processing key offset_record_570
[Event Manager] Processing key offset_record_571
[Event Manager] Agent listening on http port: 3006

```


12. Starting Best Mile real-time reporting

```
(cd bestmile)
> node app.js
```

Then, the following will appear:

```
Hermes Adapter:  Vehicles: [ 'olli_1', 'olli_2', 'olli_3' ]
Hermes Adapter:  Core Engine Hermes address: { host: 'accessibleolli.env.partners.bestmile.io',
  port: '32363' }
Hermes Adapter:  Keepalive ECHO requests frequency (ms): 3000
Hermes Adapter:  Registering vehicles.
Hermes Adapter:  Connecting and announcing vehicle olli_1
Hermes Adapter:  Connecting and announcing vehicle olli_2
Hermes Adapter:  Connecting and announcing vehicle olli_3
Hermes Adapter:  All vehicles registered.
Hermes Adapter:  Start ECHO keep-alive routine.
Hermes Adapter:  Sending ECHO request from vehicle  olli_1
Hermes Adapter:  Sending ECHO request from vehicle  olli_2
Hermes Adapter:  Sending ECHO request from vehicle  olli_3
Hermes Adapter:  Sending ECHO request from vehicle  olli_1
Hermes Adapter:  Sending ECHO request from vehicle  olli_2
Hermes Adapter:  Sending ECHO request from vehicle  olli_3
```

This tool is like telemetry, event_manager, etc.. is will just continue until aborted

Each the agent_proxy elements (see ../config/default.json for a list of agents working with agent proxy)
can be unique, so please refer to the solution specfiic readme.

13. Starting Olli Audio Agent

(note: if you set debug, e.g. export DEBUG=olli_audio_agent, you will see the text as they are queued up to be spoken by the system)

```
(cd olli_audio_agent)
> node app.js
```

Then, the following will appear:

```
        Sun, 31 Dec 2017 20:54:55 GMT olli_audio_agent Debug enabled in module: olli_audio_agent
        Sun, 31 Dec 2017 20:54:55 GMT olli_audio_agent [Olli Audio Agent] Retain Audio FIles: true
        [Olli Audio Agent] Listener target: http://127.0.0.1:5984/rule_events ^c to exit

        ***Once the simulation - the below will appear***
        [Olli Audio Agent] ***Audio Event to be queued: {
            "_id": "audio_welcome_to_olli_1:480532ac-d247-4941-982a-ab5f5c611f6d:1514753714789",
            "_rev": "1-f88c1504f8c356457c682a42a7f200f6",
            "event": "audio_welcome_to_olli_1",
            "payload": {
                "action": "play",
                "type": "audio",
                "text": "Welcome to the 2018 Accessible Olli Exhibit, provided by CTA, IBM, Local Motors and other partners.",
                "accept": "audio/mp3",
                "audio_target": "olli_1 or stop_1",
                "tag": "Audio_Welcome_to_Olli",
                "local": "welcome_olli.m4a",
                "parameters": "e1;e2;e3...",
                "_event_type": "simulation_rule_event",
                "_simulation_real_time": 1514753714789,
                "_simulation_delta_time": 1000
            }
        }
```

## Docker container approach (Optional!)
 
We can setup the containers to look at the cloned software from github, the paths need to correlate exactly to where
 you put the data.  I use a full path ONLY FOR EXAMPLE PURPOSES.
 
 Pull the couchdb from the Docker Cloud:
 
```
 $ docker pull pdykes/ao-couchdb
 
```
 
 Pull the linux/node runtime (6.11 at this writing). You can pick a different version, here are the details.
 https://github.com/nodejs/docker-node/blob/master/README.md#how-to-use-this-image
 
 
```
 $ docker pull node:6.11.5
 
```
 The next steps help you create new runtime versions of the download images.  Note, always substitute the image id
 and container ids in this document with the values the docker container commands provide to you.
```
 $ export CODE_HOME=/Users/pdykes@us.ibm.com/temp/ao_work/ao_sim/monitor
 $ export CONTAINER_HOME=/home/monitor
 $ docker images
 
```
 
```
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
pdykes/ao-couchdb   latest              b7144357196c        9 hours ago         332MB
node                6.11.5              08b98c240d7e        41 hours ago        662MB
couchdb             latest              827c620e2004        44 hours ago        226MB
ubuntu              latest              747cb2d60bbe        3 weeks ago         122MB
apache/couchdb      latest              bef56cbdb947        5 weeks ago         332MB

```

```
 $ docker run -it -v $CODE_HOME:$CONTAINER_HOME 08b98c240d7e /bin/sh
 # cd /home
 # ls
 monitor  node
 # cd monitor
 # ls
 help.txt       location.backup.json  monitor.js    registration.backup.json  this_runs_history.json  tracking.json
 kiosk_stub.js  location.json	     package.json  registration.json	     tracking.backup.json
 # npm install
 # node monitor.js
SmartPass: Registation records:[1] { Kathryn:40 SmartPass Id[E280116060000209597B5241] }
SmartPass: Registation records:[2] { Kathryn:02 SmartPass Id[000221550000000000000461] }
SmartPass: Registation records:[3] { Erich:41 SmartPass Id[000000000000000052313155] }
SmartPass: Registation records:[4] { Brent:04 SmartPass Id[000221550000000000000464] }
SmartPass: Registation records:[5] { Brent:20 SmartPass Id[000221550000000000000465] }
SmartPass: Registation records:[6] { Erich:27 SmartPass Id[000221252000000000000254] }
SmartPass: Registation records:[7] { Brent:34 SmartPass Id[300833B2DDD9014000000000] }
SmartPass: Registation records:[8] { Grace:07 SmartPass Id[E280116060000209597B5202] }
SmartPass: Registation records:[9] { Grace:30 SmartPass Id[E280116060000209597B4862] }
SmartPass: Registration File Loaded: registration.json
SmartPass: Location records:[0] { 1:registration] }
SmartPass: Location records:[1] { 2:olli_stop_entry] }
SmartPass: Location records:[2] { 3:olli_stop_side_exit] }
SmartPass: Location records:[3] { 4:olli_stop_end_exit] }
SmartPass: Location records:[4] { 5:olli_roller] }
SmartPass: Simulation start time established
SmartPass: Persona: Erich:41 Location: olli_stop Transistion: olli_stop_end_exit Simulation Time: 1509978586868
SmartPass: Persona: Grace:30 Location: olli_roller Transistion: olli_roller Simulation Time: 1509978619119
SmartPass: Persona: Grace:30 Location: exhibit Transistion: olli_roller Simulation Time: 1509978620135
SmartPass: Persona: Brent:20 Location: olli_stop Transistion: olli_stop_entry Simulation Time: 1509978640335
SmartPass: Persona: Grace:07 Location: olli_stop Transistion: olli_stop_entry Simulation Time: 1509978640589
SmartPass: Persona: Kathryn:40 Location: registration Transistion: registration Simulation Time: 1509978643855
SmartPass: Persona: Kathryn:40 Location: registration Transistion: registration Simulation Time: 1509978644868
SmartPass: Simulation Mode Complete
# exit
```

To run in debug:


```
 $ docker run -it -v $CODE_HOME:$CONTAINER_HOME 08b98c240d7e /bin/sh
 # cd /home/monitor
 # ls
 help.txt       location.backup.json  monitor.js    registration.backup.json  this_runs_history.json  tracking.json
 kiosk_stub.js  location.json	     package.json  registration.json	     tracking.backup.json
 [optional - should be there... ] # npm install
 # export DEBUG=monitor
 # node monitor.js
  monitor Debug enabled in module: monitor +0ms
  monitor Command line options provided:{
  monitor     "verbose": false,
  monitor     "help": false,
  monitor     "rfid_ip": "192.168.1.25",
  monitor     "rfid_port": "14150",
  monitor     "persona_registration": "registration.json",
  monitor     "location_registration": "location.json",
  monitor     "tracking_output": "tracking.json",
  monitor     "rfid_mode": false,
  monitor     "persona_transitions-db": "persona_transitions",
  monitor     "olli_roller_db": "persona_transitions",
  monitor     "olli_stop_db": "persona_transitions",
  monitor     "interval": 250,
  monitor     "registration_db": "persona_transitions",
  monitor     "database_url": "http://127.0.0.1:5984/"
  monitor } +167ms
  monitor cli_options.rfid_mode: false +2ms
  monitor post cli, simulation_mode value: true +0ms
  monitor cli_options.database_url: http://127.0.0.1:5984/ +0ms
    
```
  ... much more ...
  
  Key thing, you will notice later on, can't reach the database:
  
```
    monitor SmartPass: db perf [Grace:30]: 37 ms +1ms
  monitor Database asset insert error, throwing:  { Error: connect ECONNREFUSED 127.0.0.1:5984
    at Object.exports._errnoException (util.js:1020:11)
    at exports._exceptionWithHostPort (util.js:1043:20)
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1090:14)
  name: 'Error',
  scope: 'socket',
  errid: 'request',
  code: 'ECONNREFUSED',
  errno: 'ECONNREFUSED',
  syscall: 'connect',
  address: '127.0.0.1',
  port: 5984,
  description: 'connect ECONNREFUSED 127.0.0.1:5984',
  stacktrace: 
   [ 'Error: connect ECONNREFUSED 127.0.0.1:5984',
     '    at Object.exports._errnoException (util.js:1020:11)',
     '    at exports._exceptionWithHostPort (util.js:1043:20)',
     '    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1090:14)' ] } +5ms
  monitor Database asset insert error, throwing:  { Error: connect ECONNREFUSED 127.0.0.1:5984
    at Object.exports._errnoException (util.js:1020:11)
    at exports._exceptionWithHostPort (util.js:1043:20)
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1090:14)
    
Exit the container
# exit
$docker ps
```

Should show no entries....

# Lets get the Database up and running

```
$ docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
pdykes/ao-couchdb   latest              b7144357196c        10 hours ago        332MB
node                6.11.5              08b98c240d7e        41 hours ago        662MB
couchdb             latest              827c620e2004        44 hours ago        226MB
ubuntu              latest              747cb2d60bbe        3 weeks ago         122MB
apache/couchdb      latest              bef56cbdb947        5 weeks ago         332MB
```

```
$docker run -d -p 5984:5984 --name perry-couchdb b7144357196c   (change perry-couchdb to yours)
$ docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                                        NAMES
7c98d627b2a3        b7144357196c        "tini -- /docker-e..."   25 seconds ago      Up 24 seconds       4369/tcp, 9100/tcp, 0.0.0.0:5984->5984/tcp   perry-couchdb

```

In a browser window, go to this url:  

```
http://127.0.0.1:5984/_utils
```

In the browser, create a database:

- in the upper right of UI, click "Create Database"
- enter "persona_transitions"
- select the big less than sign in upper left corner, you will see a UI that just lists the databases

- At the command line, just make sure you can reach the database via curl:

```
 $ curl http://127.0.0.1:5984
{"couchdb":"Welcome","version":"2.1.0","features":["scheduler"],"vendor":{"name":"The Apache Software Foundation"}}

```

For mvp3 and later, to create the correct databases, etc.. set the ..\setup directory

Congrats!

Now, lets link the simulation application to the database, leave the database instance running 

# Connecting the two docker containers

Start the node shell again:

```
$docker run -it -v $CODE_HOME:$CONTAINER_HOME 08b98c240d7e /bin/sh

```
In a separate shell window:

```
$ docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED              STATUS              PORTS                                        NAMES
36c05a953629        08b98c240d7e        "/bin/sh"                About a minute ago   Up About a minute                                                sharp_goldberg
050b43304fcf        b7144357196c        "tini -- /docker-e..."   2 hours ago          Up 2 hours          4369/tcp, 9100/tcp, 0.0.0.0:5984->5984/tcp   perry-couchdb-1

```
Then issue this command to get the docker internal tcpip address for each

```
$ docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 36c05a953629
172.17.0.3
$ docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 050b43304fcf
172.17.0.2

```
Go back to the simulator

- At this point, we want the container instance "sharp_goldberg" to run the node monitor, and connect to the database running int perry-couchdb-1.
- Thus, the mapping is like this:

```
Client Docker/Node Container             Server Docker/Database Container

172.17.0.3                       ->          172.17.0.2

```
So, we need to run the simulator in the node environment:
```
# export DEBUG=monitor
# node monitor.js -d http://172.17.0.2:5984
  monitor Debug enabled in module: monitor +0ms
  monitor Command line options provided:{
  monitor     "verbose": false,
  monitor     "help": false,
  monitor     "rfid_ip": "192.168.1.25",
  monitor     "rfid_port": "14150",
  monitor     "persona_registration": "registration.json",
  monitor     "location_registration": "location.json",
  monitor     "tracking_output": "tracking.json",
  monitor     "rfid_mode": false,
  monitor     "persona_transitions-db": "persona_transitions",
  monitor     "olli_roller_db": "persona_transitions",
  monitor     "olli_stop_db": "persona_transitions",
  monitor     "interval": 250,
  monitor     "registration_db": "persona_transitions",
  monitor     "database_url": "http://172.17.0.2:5984"
  monitor } +147ms
  monitor cli_options.rfid_mode: false +1ms
  monitor post cli, simulation_mode value: true +1ms
  monitor cli_options.database_url: http://172.17.0.2:5984 +1ms
  monitor cli_options.rfid_ip: 192.168.1.25 +0ms
  monitor cli_options.rfid_port: 14150 +0ms

```
... and a bit later ...

You should not see database errors or failed to connect errors, you should see:

```
  monitor Entering load_database... +1ms
  monitor SmartPass: ****Load the database - begin +0ms
  monitor Database asset get request +1ms
  monitor Database asset get request +0ms
  monitor Persisting Registration Record's DB Record: {"persona":"Kathryn","id":"40","epc":"E280116060000209597B5241"} +0ms
  monitor Database asset get request +12ms
  monitor Persisting Registration Record's DB Record: {"persona":"Kathryn","id":"02","epc":"000221550000000000000461"} +0ms
  monitor Database asset get request +2ms
  monitor Persisting Registration Record's DB Record: {"persona":"Erich","id":"41","epc":"000000000000000052313155"} +0ms
  monitor Database asset get request +1ms
  monitor Persisting Registration Record's DB Record: {"persona":"Brent","id":"04","epc":"000221550000000000000464"} +0ms

```
To verify, you can visit the web page that is still running and attached to couch db.

- Click on the persona_transitions database link
- You will now notice 9 records are present for this default simulation.

Congratulations, you are up and running!

# Time to simulate the kiosk receiving events

This solution will be a node runtime, using couchdb replication protocol to receive events.

- Open a new shell window (this will be a shell window with bash/node shell)
- Set the env variables, this enables sharing the data between host os and the container
- You could aim container to a different directory for your source, but for this demo will be
  using the same code
```
 $ export CODE_HOME=/Users/pdykes@us.ibm.com/temp/ao_work/ao_sim/monitor
 $ export CONTAINER_HOME=/home/monitor
 $ docker run -it -v $CODE_HOME:$CONTAINER_HOME --name perry-kiosk 08b98c240d7e /bin/sh
 # cd /home/monitor
```

The kiosk_stub.js script needs to be retargeted to the couchdb database url described above. In some window (docker container
typically does not have an editor).

```
# node kiosk_stub.js url <http://172.17.0.2:5984>
```

Your almost there... now switch back to the other bash/node command line container (used above to run "node monitor.js"), and restart 
the simulator

Leave the replication window visible to see the data flow. As each database record in cloudant is updated, the perry-kiosk
container will a) note a change occured, and b) client will issue an http request and pull the entire record.

As a reminder, in the node monitor container, issue this command and watch the replication shell window.

```
# node monitor.js -d http://172.17.0.2:5984

```
In the replication window, you will something similar to this:

```
Change detected:  {
    "seq": "16-g1AAAAIbeJyV0EEOgjAQBdARNOrCM-gR2mILO7mJUgaCBNuFutab6E30JnoTLIUEYkICm2kymf86mQIAFpmLsFJaaUxCpTN9vhSm7UQg12VZ5pkbzU6mMecxJqkI_od74nJjqtw1wsQKhPncQzFUCCth3whgBV_4IpIUYXlVZpujSrAvfajStybt2DSTKD22Hfi_mpoKd_MY5FEprlVi5EySccqzVl7tLiSNA0bTUcq7Vj7tLtILOKE4SvnWSueqjHIiUuxeNf8BNOSkJA",
    "id": "Kathryn:40",
    "changes": [
        {
            "rev": "3-9ece8d0f16b6092777f4570c117af26c"
        }
    ]
}
Retrieving updated record from: http://172.17.0.2:5984/persona_transitions
statusCode: 200
body: {
    "_id": "Kathryn:40",
    "_rev": "3-9ece8d0f16b6092777f4570c117af26c",
    "persona": "Kathryn",
    "persona_id": "40",
    "transition": "initialize",
    "time": 1509993225116,
    "delta_time": 0,
    "location": "exhibit",
    "old_location": "exhibit",
    "smartpass_id": "E280116060000209597B5241"
}
```

... the changes will just keep scrolling by ...
 
 
 If you look at the containers in yet another shell window, you should see something like this (open up your screen ;-) ):
 
```
 $ docker ps 
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                                        NAMES
fd62863933a8        08b98c240d7e        "/bin/sh"                3 minutes ago       Up 3 minutes                                                     perry-kiosk
36c05a953629        08b98c240d7e        "/bin/sh"                About an hour ago   Up About an hour                                                 sharp_goldberg
050b43304fcf        b7144357196c        "tini -- /docker-e..."   3 hours ago         Up 3 hours          4369/tcp, 9100/tcp, 0.0.0.0:5984->5984/tcp   perry-couchdb-1

```
Lastly to clean up:

- Issue a "docker stop <CONTAINER ID>" for each container
- You can also issue a "docker rmi <IMAGE>" for each docker image
    
... have a great holiday, things of import are near ...
