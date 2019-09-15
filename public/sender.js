// I don't think these are actually being used
const REQUEST_VIDEO = true;
const REQUEST_AUDIO = false;
//signaling = new WebSocket('ws://localhost:8081');
signaling = new WebSocket('wss://www.ccs.ssmackey.com:443');
const constraints = {audio: REQUEST_AUDIO, video: REQUEST_VIDEO}; // We don't have video, but we have a mic...
const configuration = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};
const pc = new RTCPeerConnection(configuration);

// This hot garbage is just for sanity checking
sendChannel = pc.createDataChannel("sendChannel");
sendChannel.onopen = handleSendChannelStatusChange;
sendChannel.onclose = handleSendChannelStatusChange;
function handleSendChannelStatusChange(e)
{
  console.log("handleSendChannelStatusChange called");
  if(sendChannel)
  {
    var state = sendChannel.readyState;
    if(state === "open")
    {
      console.log("Sending sanity check");
      sendChannel.send("SANITY CHECK!");
    }
    else
    {
      console.log("Data channel is not open");
    }
  }
}

signaling.onopen = function (event) {
  signaling.send("HELLO_SENDER");
};

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
      console.log("dud candidate");
    }
}

// let the "negotiationneeded" event trigger offer generation
//console.log("warning, disabling RTC aspect!");
pc.onnegotiationneeded = async () => {
  console.log("onnegotiationneeded event fired");
  try {
    await pc.setLocalDescription(await pc.createOffer());

    // send the offer to the other peer
    payload = {desc: pc.localDescription};
    console.log("Sending: %s", JSON.stringify(payload));
    signaling.sendBlob(payload);
  } catch (err) {
    console.error(err);
  }
};

// once remote track media arrives, show it in remote video element
pc.ontrack = (event) => {
  // don't set srcObject again if it is already set.
  if (remoteView.srcObject) return;
  //remoteView.srcObject = event.streams[0]; // The other guys stream
};

signaling.onmessage = async (event) => {
  payload = JSON.parse(event.data);
  desc = payload.desc;
  candidate = payload.candidate;

  console.log("Message received");
  console.log(payload);
  try {
    if (desc) {
      // if we get an offer, we need to reply with an answer
      if (desc.type === 'offer') {
        await pc.setRemoteDescription(desc);
        const stream =
          await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach((track) =>
          pc.addTrack(track, stream));
        await pc.setLocalDescription(await pc.createAnswer());
        signaling.sendBlob({desc: pc.localDescription});
      } else if (desc.type === 'answer') {
        await pc.setRemoteDescription(desc);
      } else {
        console.log('Unsupported SDP type.');
      }
    } else if (candidate) {
      await pc.addIceCandidate(candidate);
    }
  } catch (err) {
    console.error(err);
  }
};

// Old way
/*
function _startScreenCapture(success) {
    if (navigator.getDisplayMedia) {
      console.log("First method");
      return navigator.getDisplayMedia({video: true});
    } else if (navigator.mediaDevices.getDisplayMedia) {
      console.log("Second method");
      return navigator.mediaDevices.getDisplayMedia({video: true});
    } else {
      console.log("Third method");
      return navigator.mediaDevices.getUserMedia({video: {mediaSource: 'screen'}});
    }
}
*/

window.onload = async function() {
  try {
    function handleSuccess(stream)
    {
      //const video = document.getElementById("self_view");
      //video.srcObject = stream;

      stream.getTracks().forEach((track) =>
        pc.addTrack(track, stream));

      the_alert = document.getElementById("is_streaming");
      the_alert.innerHTML = "STREAMING!!";
    }

    function handleError(error)
    {
      console.error('navigator.getUserMedia error: ', error);
    }
    // get local stream, show it in self-view and add it to be sent
    navigator.mediaDevices.getUserMedia({video: true}).then(handleSuccess).catch(handleError);    
    //navigator.mediaDevices.getDisplayMedia({video: true}).then(handleSuccess).catch(handleError);    
  } catch (err) {
    console.error(err);
  }
} 
