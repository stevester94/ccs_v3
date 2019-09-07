const REQUEST_VIDEO = true;
const REQUEST_AUDIO = false;
signaling = new WebSocket('ws://localhost:8081');
const constraints = {audio: REQUEST_AUDIO, video: REQUEST_VIDEO}; // We don't have video, but we have a mic...
const configuration = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};
const pc = new RTCPeerConnection(configuration);

signaling.sendBlob = function(payload) {
    this.send(JSON.stringify(payload));
}


// send any ice candidates to the other peer
pc.onicecandidate = function(e) {
    console.log("onicecandidate event fired");
    payload = {candidate: e.candidate};
    signaling.sendBlob(payload);
}

// let the "negotiationneeded" event trigger offer generation
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

// call start() to initiate
function start() {
  try {
    // get local stream, show it in self-view and add it to be sent
    const stream =
      //await navigator.mediaDevices.getUserMedia(constraints);
      navigator.mediaDevices.getUserMedia({video: {mediaSource: 'screen'}});

    //stream.getTracks().forEach((track) =>
      //pc.addTrack(track, stream));
    //selfView.srcObject = stream; // Our stream
  } catch (err) {
    console.error(err);
  }
}

signaling.onmessage = async (event) => {
  payload = JSON.parse(event.data);
  desc = payload.desc;
  candidate = payload.candidate;

  console.log("Message received");
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

function _startScreenCapture() {
    if (navigator.getDisplayMedia) {
      return navigator.getDisplayMedia({video: true});
    } else if (navigator.mediaDevices.getDisplayMedia) {
      return navigator.mediaDevices.getDisplayMedia({video: true});
    } else {
      return navigator.mediaDevices.getUserMedia({video: {mediaSource: 'screen'}});
    }
}

window.onload = async function() {
  try {
    // get local stream, show it in self-view and add it to be sent
    const stream =
      //await navigator.mediaDevices.getUserMedia(constraints);
      await _startScreenCapture();

    stream.getTracks().forEach((track) =>
      pc.addTrack(track, stream));
    the_alert = document.getElementById("is_streaming");
    the_alert.innerHTML = "STREAMING!!";
  } catch (err) {
    console.error(err);
  }
} 
