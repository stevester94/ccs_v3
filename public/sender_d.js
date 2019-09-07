(function() {

  // Define "global" variables
  
  var connectButton = null;
  var disconnectButton = null;
  var sendButton = null;
  var messageInputBox = null;
  var receiveBox = null;
  
  var sender_connection = null;   // RTCPeerConnection for our "local" connection
  
  var sendChannel = null;       // RTCDataChannel for the local (sender)

  var signaling = null; // Sender websocket
  var signaling_address = "ws://localhost:8081";
  var STUN_config = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};
  
  // Functions
  
  // Set things up, connect event listeners, etc.
  
  function startup() {
    connectButton = document.getElementById('connectButton');
    disconnectButton = document.getElementById('disconnectButton');
    sendButton = document.getElementById('sendButton');
    messageInputBox = document.getElementById('message');
    receiveBox = document.getElementById('receivebox');

    // Set event listeners for user interface widgets

    connectButton.addEventListener('click', connectPeers, false);
    disconnectButton.addEventListener('click', disconnectPeers, false);
    sendButton.addEventListener('click', sendMessage, false);

    // Setup signaling
    signaling = new WebSocket(signaling_address);
    signaling.sendBlob = function(payload) {
        console.log("sending blob");
        this.send(JSON.stringify(payload));
    }

    sender_connection = new RTCPeerConnection(STUN_config);

    signaling.onmessage = async (event) => {
      console.log("Message received");
      payload = JSON.parse(event.data);
      desc = payload.desc;
      candidate = payload.candidate;

      try {
        if (desc) {
          // Sender will not get an offer
          if(desc.type === 'offer')
          {
            console.log("Got an offer!!!!");
          }
          if (desc.type === 'answer') {
            console.log("Got an answer!");
            await sender_connection.setRemoteDescription(desc);
          } else {
            console.log('Unsupported SDP type.');
          }
        } else if (candidate) {
          console.log("Got a candidate");
          await sender_connection.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error(err);
      }
    };

    // send any ice candidates to the other peer
    sender_connection.onicecandidate = function(candidate) {
        console.log("onicecandidate event fired");
        console.log(candidate);
        signaling.sendBlob(candidate);
    }
  }

  
  // Connect the two peers. Normally you look for and connect to a remote
  // machine here, but we're just connecting two local objects, so we can
  // bypass that step.
  
  function connectPeers() {
    // Create the local connection and its event listeners
    
    
    // Create the data channel and establish its event listeners
    sendChannel = sender_connection.createDataChannel("sendChannel");
    sendChannel.onopen = handleSendChannelStatusChange;
    sendChannel.onclose = handleSendChannelStatusChange;
    
    sender_connection.onnegotiationneeded = async () => {
      console.log("onnegotiationneeded event fired");
      try {
        await sender_connection.setLocalDescription(await sender_connection.createOffer());

        // send the offer to the other peer
        payload = {desc: sender_connection.localDescription};
        console.log("Sending: %s", JSON.stringify(payload));
        signaling.sendBlob(payload);
      } catch (err) {
        console.error(err);
      }
    };

    // Now create an offer to connect; this starts the process
    // This handshake has to be broken apart to work over websocket signaling 
/*
    sender_connection.createOffer()
    .then(offer => sender_connection.setLocalDescription(offer))
    .then(() => receiver_connection.setRemoteDescription(sender_connection.localDescription))
    .then(() => receiver_connection.createAnswer())
    .then(answer => receiver_connection.setLocalDescription(answer))
    .then(() => sender_connection.setRemoteDescription(receiver_connection.localDescription))
    .catch(handleCreateDescriptionError);
*/
  }
    
  // Handle errors attempting to create a description;
  // this can happen both when creating an offer and when
  // creating an answer. In this simple example, we handle
  // both the same way.
  
  function handleCreateDescriptionError(error) {
    console.log("Unable to create an offer: " + error.toString());
  }
  
  // Handle successful addition of the ICE candidate
  // on the "local" end of the connection.
  
  function handleLocalAddCandidateSuccess() {
    connectButton.disabled = true;
  }

  // Handle successful addition of the ICE candidate
  // on the "remote" end of the connection.
  
  function handleRemoteAddCandidateSuccess() {
    disconnectButton.disabled = false;
  }

  // Handle an error that occurs during addition of ICE candidate.
  
  function handleAddCandidateError() {
    console.log("Oh noes! addICECandidate failed!");
  }

  // Handles clicks on the "Send" button by transmitting
  // a message to the remote peer.
  
  function sendMessage() {
    var message = messageInputBox.value;
    sendChannel.send(message);
    
    // Clear the input box and re-focus it, so that we're
    // ready for the next message.
    
    messageInputBox.value = "";
    messageInputBox.focus();
  }
  
  // Handle status changes on the local end of the data
  // channel; this is the end doing the sending of data
  // in this example.
  
  function handleSendChannelStatusChange(event) {
    console.log("Send status changed");

    if (sendChannel) {
      var state = sendChannel.readyState;
    
      if (state === "open") {
        messageInputBox.disabled = false;
        messageInputBox.focus();
        sendButton.disabled = false;
        disconnectButton.disabled = false;
        connectButton.disabled = true;
      } else {
        messageInputBox.disabled = true;
        sendButton.disabled = true;
        connectButton.disabled = false;
        disconnectButton.disabled = true;
      }
    }
  }
  
  // Close the connection, including data channels if they're open.
  // Also update the UI to reflect the disconnected status.
  
  function disconnectPeers() {
  
    // Close the RTCDataChannels if they're open.
    
    sendChannel.close();
    
    // Close the RTCPeerConnections
    
    sender_connection.close();

    sendChannel = null;
    sender_connection = null;
    
    // Update user interface elements
    
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    sendButton.disabled = true;
    
    messageInputBox.value = "";
    messageInputBox.disabled = true;
  }
  
  // Set up an event listener which will run the startup
  // function once the page is done loading.
  
  window.addEventListener('load', startup, false);
})();
