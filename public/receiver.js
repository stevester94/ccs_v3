// handles JSON.stringify/parse

signaling = new WebSocket('wss://www.ccs.ssmackey.com:443');
const REQUEST_VIDEO = false;
const constraints = {audio: true, video: REQUEST_VIDEO}; // We don't have video, but we have a mic...
const configuration = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};
const pc = new RTCPeerConnection(configuration);
const ICD = share.ICD;

signaling.onopen = function (event) {
  signaling.sendBlob({C2I: ICD.HELLO_RECEIVER});
};


// This hot garbage is just for sanity checking
pc.ondatachannel = receiveChannelCallback; 
var receiveChannel = null;

function receiveChannelCallback(event) {
  console.log("RECEIVED A FUCKING CHANNEL");
  receiveChannel = event.channel;
  receiveChannel.onmessage = handleReceiveMessage;
}

function handleReceiveMessage(e)
{
  console.log("MESSAGE RECEIVED");
  console.log("Received the following: " + e.data);
}

// END hot garbage


signaling.sendBlob = function(payload) {
    this.send(JSON.stringify(payload));
}

// send any ice candidates to the other peer
pc.onicecandidate = function(e) {
    console.log("onicecandidate event fired");
    if(e.candidate)
    {
      payload = {candidate: e.candidate};
      signaling.sendBlob(payload);
    }
    else
    {
      console.log("Dud candidate");
    }
}

// once remote track media arrives, show it in remote video element
pc.ontrack = (event) => {
  console.log("Receiving track!");

  the_video = document.getElementById("the_video");   
  // don't set srcObject again if it is already set.
  the_video.srcObject = event.streams[0]; // The other guys stream
  console.log("Number possible streams: %s", event.streams.length);
};

function C2I_handler(C2I)
{
  if(C2I === "sender_killed") {
    console.log("Received C2I that sender was killed");
    title = document.getElementById("title");
    title.innerHTML = "Webcam died, reload this page";
    alert("Webcam died, reload this page");
  }
  else {
    console.log("Unknown C2I received");
  }
}

signaling.onmessage = async (event) => {
  console.log("Message received: %s", event.data);

  payload = JSON.parse(event.data);
  desc = payload.desc;
  candidate = payload.candidate;
  C2I       = payload.C2I;


  try {
    if (desc) {
      // if we get an offer, we need to reply with an answer
      if (desc.type === 'offer') {
        await pc.setRemoteDescription(desc);

        /* // For 2-way streaming
        const stream =
          await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach((track) =>
          pc.addTrack(track, stream));
        */
        await pc.setLocalDescription(await pc.createAnswer());
        signaling.sendBlob({desc: pc.localDescription});
      } else if (desc.type === 'answer') {
        await pc.setRemoteDescription(desc);
      } else {
        console.log('Unsupported SDP type.');
      }
    } else if (candidate) {
      await pc.addIceCandidate(candidate);
    } else if(C2I) {
      C2I_handler(C2I);
    } else {
      console.log("Unknown message received");
    }
        
  } catch (err) {
    console.error(err);
  }
};
