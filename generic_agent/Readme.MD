agent_proxy example client overview

The architecture for this sample based upon starting the agents first, and then the agent_proxy component for each instance you wish to simulate.

For example, here is a common sequence

- Open a shell to this directory
- Estabalish the config/default.json file you will read, e.g. typically
   export NODE_CONFIG_DIR=../../../../config
- Optionally establish DEBUG, e.g. typically
   export DEBUG=generic_agent
- Then N number of agents can be started, but they must be registered in the
  configuration file mentioned above.

  For example, assume this configuration:

```
{
    "global" : {
        "nosql_url" : "http://127.0.0.1:5984",
        "nosql_user" : "",
        "nosql_password" : ""
    },
    "agent_proxy" : {
        "module_name"           : "proxy_agent",
        "module_Name"           : "Proxy Agent",
        "endpoint_url"          : "http://127.0.0.1:3002",
        "simulation_interval"   : "10000",
        "proxy_list" : [
         {
           "name"           : "ultrahaptics_01",
           "instance"       : "01",
           "database"       : "ultrahaptics_01",
           "to_device_url"  : "http://127.0.0.1:3003",
           "to_device"      : "to_device",
           "from_device"    : "from_device"
         },
         {
           "name"           : "kintrans_01",
           "instance"       : "01",
           "database"       : "kintrans_01",
           "to_device_url"  : "http://127.0.0.1:3004",
           "to_device"      : "to_device",
           "from_device"    : "from_device"    
         },
         {
           "name"           : "kintrans_02",
           "instance"       : "02",
           "database"       : "kintrans_02",
           "to_device_url"  : "http://127.0.0.1:3005",
           "to_device"      : "to_device",
           "from_device"    : "from_device"   
         }
        ]
    }

```

In this case three specific agents are allows to connecto the agent_proxy
server. As a user, the sequnce would be something like this:

a) Start the agents (you can start each on in their own terminal window)
   node app.js ultrahaptics_01
   node app.js kintrans_01
   node app.js kintrans_02

b) change directory to the agent_proxy directory, set the env and start
   that agent.

   cd <install dir>/accessible_olli/smartpass/mvp2/agent_proxy
   export NODE_CONFIG_DIR=../config
   node app.js

The next section relies on values set in the configuration tree, specifically
the default.json illustrated above.

At this point, the agent_proxy will send an init to each of the generic_agents,
and this message will be of this format (JSON via HTTP POST):

{ 
  event: 'init',
  agent_id: 'kintrans_01',
  agent_instance: '01',
  endpoint_url: 'http://127.0.0.1:3002' 
}
   
From that point on, the client should post all events to this URI, and provide
an HTTP Post URI at:

http://127.0.0.1:3004

Specifically, the agent should listen on port 3004 of the local host where the
agent is started. The agent_proxy will send HTTP POST events to this target URI.

The agents will need to support the following events:

```
init_template 

{
    "event": "init",
    "agent_id": "tbd",
    "agent_instance": "tbd",
    "endpoint_url": end_point_url
}

start_template 

{
    "event": "start"
}

suspend_template 

{
    "event": "suspend"
}

exit_template

{
    "event": "exit"
}

```

As the client reieves event, they will provided in this format:

```
{
  "agent_id": "kintrans_01",
  "agent_version": "0.0.1",
  "event": "Event ID 2",
  "payload": {
    "result": "success",
    "data": 2
  }
}
```

The agent can establish the event value, as well as the payload attributes.
The clients should push events to the agent_proxy in teh same format.

Finally, in couchdb, there will be a table for each agent, with two records. 
There will be a record called "to_device" and another "from_device". These
items can be "followed" like other events for elements that will listen and
react to the events.
