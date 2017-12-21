var express        =        require("express");
var bodyParser     =        require("body-parser");
var app            =        express();
var x = 0;
//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/',function(request,response){
   console.log("kintrans request made");
   response.send('{ "x" : "z"}');
});

app.get('/', function (req, res) {
   console.log("Kintrans request #" + x + " made");
   response.send('{ "x" : "z"}');
   x++;
})

port = 3000;
app.listen(port);
console.log('Listening at http://localhost:' + port);
