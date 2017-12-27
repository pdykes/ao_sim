# CES Hermes Adapter

Node.js adapter that connects to Core Engine and transforms events received through the agent proxy into Hermes Messages using AV-JS and Hermes.

## Installation

The BestMile AccessibleOlli Adapter relies on two (private) remote GIT repositories, [AV-JS](https://github.com/BestMile/av-js) and [Hermes](https://github.com/BestMile/hermes), which you need to clone into `/av-js` and `/av-js/hermes` (respectively). Note that you need to be given access to those repositories in order to be able to clone them (send an e-mail to the BestMile team).

```
git clone git@github.com:BestMile/av-js.git
git clone git@github.com:BestMile/hermes.git av-js/hermes
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

## Privacy

**AV-JS** and the **Hermes** protocol source codes are proprietary of BestMile and have been shared to IBM exclusively in the scope of #AccessibleOlli. Their access and publishing is restricted. Please contact BestMile for receiving access to those source codes.

## BestMile Team Contacts

* Bastien Rojanawisut <bastien.rojanawisut@bestmile.com>, Integration Engineer, who wrote this code
* David Geretti <david.geretti@bestmile.com>, Lead Engineer
* Lissa Franklin <lissa.franklin@bestmile.com>, VP Business Development and Marketing
* Leemor Chandally <leemor.chandally@bestmile.com>, Director of Strategic Partnerships (North America)
* General BestMile support <support@bestmile.com>
