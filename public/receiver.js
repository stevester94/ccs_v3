// handles JSON.stringify/parse

signaling = new WebSocket('ws://localhost:8082');
const REQUEST_VIDEO = false;
const constraints = {audio: true, video: REQUEST_VIDEO}; // We don't have video, but we have a mic...
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

// once remote track media arrives, show it in remote video element
pc.ontrack = (event) => {
  console.log("Receiving track!");

  the_video = document.getElementById("the_video");   
  // don't set srcObject again if it is already set.
  the_video.srcObject = event.streams[0]; // The other guys stream
  console.log("Number possible streams: %s", event.streams.length);
};

signaling.onmessage = async (event) => {
  console.log("Message received: %s", event.data);

  payload = JSON.parse(event.data);
  desc = payload.desc;
  candidate = payload.candidate;


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
