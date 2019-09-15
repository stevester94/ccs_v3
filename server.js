// Websocket server portion
const WebSocket = require('ws');

// SSL Variant
const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');

// Chromium spawner
const { spawn } = require('child_process');
var chromium  = null;
var ffmpeg    = null;
var cleanup   = null;
var kill_proc = null;


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
    if(msg === "HELLO_RECEIVER")
    {
      //console.log("Received a HELLO_RECEIVER, not forwarding, and spinning up sender");      
      chromium  = spawn("su" , ["pi", "-c", "xvfb-run chromium-browser -a --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-video-capture='output.y4m' --allow-file-access https://www.ccs.ssmackey.com/sender.html"]);
      ffmpeg    = spawn("su" , ["pi", "-c", "ffmpeg -f v4l2 -framerate 25 -video_size 640x480 -i /dev/video0 output.y4m"]);

    

      chromium.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
      chromium.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });
      chromium.on('close', (code) => {
        console.log(`chromium process exited with code ${code}`);
      });
      ffmpeg.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
      ffmpeg.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });
      ffmpeg.on('close', (code) => {
        console.log(`ffmpeg process exited with code ${code}`);
      });
 
      

      ws.on("close", function(e) {
        console.log("Receiver has closed, do the thing");
        chromium.kill();
        ffmpeg.kill();
        cleanup   = spawn("rm", ["output.y4m"]);
        kill_proc = spawn("killall", ["Xvfb"]);

        cleanup.on('close', (code) => {
          console.log(`cleanup exited with code ${code}`);
        });
        kill_proc.on('close', (code) => {
          console.log(`kill_proc exited with code ${code}`);
        });

        ffmpeg   = null;
        chromium = null;
      });

      return;
    }
    if(msg === "HELLO_SENDER")
    {
      console.log("Received a HELLO_SENDER, not forwarding, marking as sender");
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
