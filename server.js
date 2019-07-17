// Websocket server portion
const WebSocket = require('ws');
 

const receiver_socket = new WebSocket.Server({ port: 8082 });
const sender_socket   = new WebSocket.Server({ port: 8081 });

// The sender will broadcast to all receivers 
sender_socket.on('connection', function connection(ws) {
  console.log("A sender has connected");

  ws.on('message', function incoming(message) {
    console.log('received: %s on sender socket', message);

    receiver_socket.clients.forEach(function(client) {
      console.log("  Relaying to receiver");
      client.send(message);
    });
  });
});

receiver_socket.on('connection', function connection(ws) {
  console.log("A receiver has connected");

  ws.on('message', function incoming(message) {
    console.log('received: %s on receiver socket', message);

    // Yeah it's fucky, I just want to see it work
    sender_socket.clients.forEach(function(client) {
      console.log("  Relaying to sender");
      client.send(message);
    });
  });
});


// Static server portion
var express = require('express');
var app = express();

app.use(express.static('public'));

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});


