// Websocket server portion
const WebSocket = require('ws');

// SSL Variant
const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');

// Chromium spawner
const { spawn } = require('child_process');
const disk = require('diskusage');
var chromium   = null;
var ffmpeg     = null;
var cleanup    = null;
var kill_proc  = null;
var disk_timer = null;
var DISK_USAGE_ABORT_THRESH = 0.75;


app.use(express.static('public'));

// we will pass our 'app' to 'https' server
const server = https.createServer({
    key: fs.readFileSync('./secrets/privkey1.pem'),
    cert: fs.readFileSync('./secrets/cert1.pem')
    //passphrase: 'E'
}, app);

// Alert all the receivers that the sender was killed
// This is used for the atypical cases the sender was killed
// IE when the disk is full
function alert_sender_killed()
{
  conns.forEach(function(conn)
  {
      payload = {C2I: "sender_killed"};
      conn.send(JSON.stringify(payload));
  });
}


async function check_disk_usage()
{
  console.log("CHECKING DISK USAGE");
  const res = await disk.check(".");
  //console.log(`Disk free: ${res.free}`);
  //console.log(`Disk available: ${res.available}`);
  //console.log(`Disk total: ${res.total}`);
  percent_avail = res.available / res.total;
  console.log(`Disk space avail: ${percent_avail}`);

  if(percent_avail < DISK_USAGE_ABORT_THRESH)
  {
    console.log(`Hit the disk usage threshold of ${DISK_USAGE_ABORT_THRESH}, killing the sender`);
    destroy_sender();
    alert_sender_killed();
  }
    
}

function init_sender()
{
  disk_timer = setInterval(check_disk_usage, 1000); //time is in ms

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
}

function destroy_sender()
{
  clearInterval(disk_timer);
  if(ffmpeg != null && chromium != null)
  {
    console.log("Receiver has closed, do the thing");
    chromium.kill();
    ffmpeg.kill();
  }
  else
  {
    console.log("Warning, chromium and ffmpeg were killed already");
  }

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
}




const wss = new WebSocket.Server({server});
var conns = [];

wss.on('connection', function connection(ws) {
  console.log("Got connection");
  conns.push(ws);
  ws.on('message', function message(msg) {
    console.log(msg);
    if(msg === "HELLO_RECEIVER")
    {
      init_sender(); 
      ws.on("close", function(e) {
        destroy_sender();
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
