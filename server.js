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


// SSL Variant
const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');

app.use(express.static('public'));

// we will pass our 'app' to 'https' server
const server = https.createServer({
    key: fs.readFileSync('./secrets/privkey1.pem'),
    cert: fs.readFileSync('./secrets/cert1.pem')
    //passphrase: 'E'
}, app);

const wss = new WebSocket.Server({server});
var conns = [];

wss.on('connection', function connection(ws) {
  console.log("Got connection");
  conns.push(ws);
  ws.on('message', function message(msg) {
    console.log(msg);
    if(msg == "HELLO")
    {
      console.log("Received a HELLO, not forwarding");
      return;
    }

    conns.forEach(function(conn)
    {
      if(conn != ws)
      {
        conn.send(msg);
      }
      else
      {
        console.log("Not forwarding to self");
      }
    });
  });
});

server.listen(443);

/*
server.listen(443, function listening() {
  console.log("Listening!");
  console.log(`wss://localhost:${server.address().port}`);
  //
  // If the `rejectUnauthorized` option is not `false`, the server certificate
  // is verified against a list of well-known CAs. An 'error' event is emitted
  // if verification fails.
  //
  // The certificate used in this example is self-signed so `rejectUnauthorized`
  // is set to `false`.
  //
  const ws = new WebSocket(`wss://localhost:${server.address().port}`, {
    rejectUnauthorized: false
  });

  ws.on('open', function open() {
    ws.send('All glory to WebSockets!');
  });
});
*/
