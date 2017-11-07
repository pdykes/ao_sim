

# Lets get the simulation and replication code downloaded, and run in a few docker containers optionally  ;-)

   - preqs
      download and install git and docker community edition (ce), takes a few minutes and reboots
      
   - docker config      
      ensure you have a shared directory on the host which Docker can read 
      
      (for mac open docker, shares /Users by default, other os vary)
      
   - rest we will work through...
   
# Download the code from github, and a container


Current Instructions
      

   Command line tooling walk through
   
```
 $ = host/mac shell command  # = docker image shell command
```

 Create a docker/node directory somewhere, then:

```
 $ cd temp/ao_work
 $ git clone https://github.com/pdykes/ao_sim 
 $ cd ao_sim 
 $ pwd
 /Users/pdykes@us.ibm.com/temp/ao_work/ao_sim
```
 
pwd output value => show you where the code has been placed, denote that location as used several times below.

Call this directory the target_directory


At this points there is two paths, one is simpler than other, but the container path will be what we get into
as the solution begins to grow.

## Utilzing local shells and cloudant (docker image of cloudant (below ok as well))

1. a) For local install, install Nodejs... visit nodejs.org, and install the current LTS for your system.

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

## Docker container approach
 
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
    
till we talk...
