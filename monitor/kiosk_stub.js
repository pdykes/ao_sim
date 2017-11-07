
var listener_target = "http://172.17.0.2:5984/persona_transitions";

if ((process.argv[2] == "url") && (process.argv[3] !== 'undefined')) {
 listener_target = process.argv[3] + "/persona_transitions";
 console.log("Target url updated to: [" + listener_target  + "], ^c to exit");
}

console.log("Listener target:", listener_target);

var request = require('request');
var follow = require('follow');

var opts = {}; // Same options paramters as before
var feed = new follow.Feed(opts);

// You can also set values directly.
feed.db            = listener_target;
feed.since         = 'now';
// feed.heartbeat     = 30    * 1000
// feed.inactivity_ms = 86400 * 1000;

/*
feed.filter = function(doc, req) {
  // req.query is the parameters from the _changes request and also feed.query_params.
  console.log('Filtering for query: ' + JSON.stringify(req.query));

  if(doc.stinky || doc.ugly)
    return false;
  return true;
}
*/

feed.on('change', function(change) {
  // console.log('Doc ' + '/' + change.id + ' in change ' + change.seq + ' is neither stinky nor ugly.');
  console.log("Change detected: ", JSON.stringify(change, null, 4));
  console.log("Retrieving updated record from:", listener_target);
  request(listener_target + "/" + change.id, function (error, response, body) {
   if (error != null) {
       console.log('error:', error); // Print the error if one occurred
   }
   console.log('statusCode:', response && response.statusCode); // Print the response status 
   var json_body = JSON.parse(body);
    console.log('body:', JSON.stringify(json_body, null, 4)); // Print the object
   });    
})

feed.on('error', function(er) {
  console.error('Since Follow always retries on errors, this must be serious', er);
  // throw er;
})

feed.follow();
