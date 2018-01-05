# CES Hermes Adapter

Node.js adapter that connects to Core Engine and transforms events received through the agent proxy into Hermes Messages using AV-JS and Hermes.

**>> [Click here to access BestMile Operator Dashboard directly (no login required)](https://accessibleolli.env.partners.bestmile.io/sites/rochester/control-center?passphrase=eyJ1c2VybmFtZSI6ImFjY2Vzc2libGVvbGxpQGJlc3RtaWxlLmNvbSIsInBhc3N3b3JkIjoiYnE2VDJVZjgifQ==) <<**

## Installation

The BestMile AccessibleOlli Adapter relies on two (private) remote GIT repositories, [AV-JS](https://github.com/BestMile/av-js) and [Hermes](https://github.com/BestMile/hermes), which you need to clone into `/av-js` and `/av-js/hermes` (respectively). Note that you need to be given access to those repositories in order to be able to clone them (send an e-mail to the BestMile team).

```
git clone https://github.com/BestMile/av-js.git
git clone https://github.com/BestMile/hermes.git av-js/hermes
```

## Run

Setup the link to the config file: `export NODE_CONFIG_DIR=../config`

Run `$ node app.js`. The adapter will automatically connect to BestMile Core Engine as defined with the accesses from the config.

*BestMile is not an **Agent** in the sense that it does not require to be configured in the `agent_proxy.proxy_list` and does not interact with the **Agent Proxy** at all. It is completely autonomous.*

If everything is going well you should see in the logs:
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
...
```

You can access BestMile Operator Dashboard to see the vehicles running following these links (no login required):

**For the Overview Map**

[https://accessibleolli.env.partners.bestmile.io/sites/rochester/overview?passphrase=eyJ1c2VybmFtZSI6ImFjY2Vzc2libGVvbGxpQGJlc3RtaWxlLmNvbSIsInBhc3N3b3JkIjoiYnE2VDJVZjgifQ==](https://accessibleolli.env.partners.bestmile.io/sites/rochester/control-center?passphrase=eyJ1c2VybmFtZSI6ImFjY2Vzc2libGVvbGxpQGJlc3RtaWxlLmNvbSIsInBhc3N3b3JkIjoiYnE2VDJVZjgifQ==)

**For the Control Center**

[https://accessibleolli.env.partners.bestmile.io/sites/rochester/control-center?passphrase=eyJ1c2VybmFtZSI6ImFjY2Vzc2libGVvbGxpQGJlc3RtaWxlLmNvbSIsInBhc3N3b3JkIjoiYnE2VDJVZjgifQ==](https://accessibleolli.env.partners.bestmile.io/sites/rochester/control-center?passphrase=eyJ1c2VybmFtZSI6ImFjY2Vzc2libGVvbGxpQGJlc3RtaWxlLmNvbSIsInBhc3N3b3JkIjoiYnE2VDJVZjgifQ==)

## Testing

There are 9 different Rochester "sites" on our BestMile platform. A *site* is a bit like a sub-environment. Each of these "site" has three registered shuttles.

**For production we will use the site "Rochester" with shuttles "olli_1", "olli_2" and "olli_3".**

For testing, we can use sites "Rochester Y" with shuttles "olli_Y1", "olli_Y2" and "olli_Y3". "Y" can be any value between 2 and 9 (included). For using these sites, we need to map the telemetry data from the local olli shuttles to the site-specific remote olli shuttle. **It is necessary for example to map "olli_1" to "olli_61" if you want to see the shuttle in the "Rochester 6" environment.**

The mapping should be done in the config. Each tester should thus map its shuttle names to a different environment to avoid overlaps. For example:

```
  "vehicle_ids": {
    "olli_1": "olli_61",
    "olli_2": "olli_62",
    "olli_3": "olli_63"
  }
```

should be used for the tester using environment #6, which is accessible at https://accessibleolli.env.partners.bestmile.io/sites/rochester-6/overview

The different sites are available in the top left dropdown menu on the Operator Dashboard.

## Troubleshooting

#### Vehicles are all "disabled"

Make an HTTP `POST` request with an empty body to [http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/60b77621-29e6-4d54-9a1d-149a47ba5a5c/dispatcher/enableAll](http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/60b77621-29e6-4d54-9a1d-149a47ba5a5c/dispatcher/enableAll):

```
$ curl -i -X POST http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/60b77621-29e6-4d54-9a1d-149a47ba5a5c/dispatcher/enableAll
```
... which should return something like:
```
HTTP/1.1 204 No Content
Server: akka-http/10.0.9
Date: Fri, 05 Jan 2018 10:46:49 GMT
```
Vehicles should then be enabled.

To enable vehicles on test sites ("Rochester 2-9"), POST to the following URLs:

* Rochester 2: http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/20c43573-29e6-4d54-9a1d-149a47ba5a52/dispatcher/enableAll
* Rochester 3: http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/30c43573-39e6-4d54-9a1d-149a47ba5a53/dispatcher/enableAll
* Rochester 4: http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/40c43573-49e6-4d54-9a1d-149a47ba5a54/dispatcher/enableAll
* Rochester 5: http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/50c43573-59e6-4d54-9a1d-149a47ba5a55/dispatcher/enableAll
* Rochester 6: http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/60c43573-69e6-4d54-9a1d-149a47ba5a56/dispatcher/enableAll
* Rochester 7: http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/70c43573-79e6-4d54-9a1d-149a47ba5a57/dispatcher/enableAll
* Rochester 8: http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/80c43573-89e6-4d54-9a1d-149a47ba5a58/dispatcher/enableAll
* Rochester 9: http://accessibleolli.env.partners.bestmile.io:30961/internal/sites/90c43573-99e6-4d54-9a1d-149a47ba5a59/dispatcher/enableAll

## Privacy

**AV-JS** and the **Hermes** protocol source codes are proprietary of BestMile and have been shared to IBM exclusively in the scope of #AccessibleOlli. Their access and publishing is restricted. Please contact BestMile for receiving access to those source codes.

## BestMile Team Contacts

* Bastien Rojanawisut <bastien.rojanawisut@bestmile.com>, Integration Engineer, who wrote this code
* David Geretti <david.geretti@bestmile.com>, Lead Engineer
* Lissa Franklin <lissa.franklin@bestmile.com>, VP Business Development and Marketing
* Leemor Chandally <leemor.chandally@bestmile.com>, Director of Strategic Partnerships (North America)
* General BestMile support <support@bestmile.com>
