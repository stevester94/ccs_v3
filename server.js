
// Websocket server portion
const WebSocket = require('ws');
 
const wss = new WebSocket.Server({ port: 8081 });
 
wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });
 
  ws.send('something');
});


// Static server portion
var express = require('express');
var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
    console.log("Serving index.html");
    res.sendFile("index.html");
});

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});


