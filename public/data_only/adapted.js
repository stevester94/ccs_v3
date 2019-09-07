(function() {

  // Define "global" variables
  
  var connectButton = null;
  var disconnectButton = null;
  var sendButton = null;
  var messageInputBox = null;
  var receiveBox = null;
  
  var localConnection = null;   // RTCPeerConnection for our "local" connection
  var remoteConnection = null;  // RTCPeerConnection for the "remote"
  
  var sendChannel = null;       // RTCDataChannel for the local (sender)
  var receiveChannel = null;    // RTCDataChannel for the remote (receiver)

  var local_signaling = WebSocket("ws://localhost:8081");
  var remote_signaling = WebSocket("ws://localhost:8082");
  
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

    // setup signaling
    local_signaling.onmessage = async (event) => {
      payload = JSON.parse(event.data);
      desc = payload.desc;
      candidate = payload.candidate;

      console.log("Message received");
      try {
        if (desc) {
          // if we get an offer, we need to reply with an answer
          if (desc.type === 'offer') {
            console.log("Got an offer??");
            await localConnection.setRemoteDescription(desc);
            await localConnection.setLocalDescription(await localConnection.createAnswer());
            signaling.sendBlob({desc: localConnection.localDescription});
          } else if (desc.type === 'answer') {
            console.log("Got an answer");
            await localConnection.setRemoteDescription(desc);
          } else {
            console.log('Unsupported SDP type.');
          }
        } else if (candidate) {
          await localConnection.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error(err);
      }   
    };   

    local_signaling.sendBlob = function(payload) {
        console.log("sending blob");
        this.send(JSON.stringify(payload));
    }


    remote_signaling.onmessage = async (event) => {
      payload = JSON.parse(event.data);
      desc = payload.desc;
      candidate = payload.candidate;

      console.log("Message received");
      try {
        if (desc) {
          // if we get an offer, we need to reply with an answer
          if (desc.type === 'offer') {
            console.log("Got an offer??");
            await remoteConnection.setRemoteDescription(desc);
            await remoteConnection.setLocalDescription(await remoteConnection.createAnswer());
            remote_signaling.sendBlob({desc: remoteConnection.localDescription});
          } else if (desc.type === 'answer') {
            console.log("Got an answer");
            await remoteConnection.setRemoteDescription(desc);
          } else {
            console.log('Unsupported SDP type.');
          }
        } else if (candidate) {
          await remoteConnection.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error(err);
      }   
    };  

    remote_signaling.sendBlob = function(payload) {
        console.log("sending blob");
        this.send(JSON.stringify(payload));
    }

  }
  
  // Connect the two peers. Normally you look for and connect to a remote
  // machine here, but we're just connecting two local objects, so we can
  // bypass that step.
  
  function connectPeers() {
    // Create the local connection and its event listeners
    
    localConnection = new RTCPeerConnection();
    
    // Create the data channel and establish its event listeners
    sendChannel = localConnection.createDataChannel("sendChannel");
    sendChannel.onopen = handleSendChannelStatusChange;
    sendChannel.onclose = handleSendChannelStatusChange;
    
    // Create the remote connection and its event listeners
    
    remoteConnection = new RTCPeerConnection();
    remoteConnection.ondatachannel = receiveChannelCallback;
    
    // Set up the ICE candidates for the two peers
    // SMackey: Alright, first we're going to replace the ice candidate shit with our signaling
   
    /* 
    localConnection.onicecandidate = e => !e.candidate
        || remoteConnection.addIceCandidate(e.candidate)
        .catch(handleAddCandidateError);

    remoteConnection.onicecandidate = e => !e.candidate
        || localConnection.addIceCandidate(e.candidate)
        .catch(handleAddCandidateError);
    */

    localConnection.onicecandidate = function(candidate)
    {
      local_signaling.sendBlob(candidate);
    }
    remoteConnection.onicecandidate = function(candidate)
    {
      remote_signaling.sendBlob(candidate);
    }
    
    // Now create an offer to connect; this starts the process
    
    localConnection.createOffer()
    .then(offer => localConnection.setLocalDescription(offer))
    .then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
    .then(() => remoteConnection.createAnswer())
    .then(answer => remoteConnection.setLocalDescription(answer))
    .then(() => localConnection.setRemoteDescription(remoteConnection.localDescription))
    .catch(handleCreateDescriptionError);
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
  
  // Called when the connection opens and the data
  // channel is ready to be connected to the remote.
  
  function receiveChannelCallback(event) {
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleReceiveMessage;
    receiveChannel.onopen = handleReceiveChannelStatusChange;
    receiveChannel.onclose = handleReceiveChannelStatusChange;
  }
  
  // Handle onmessage events for the receiving channel.
  // These are the data messages sent by the sending channel.
  
  function handleReceiveMessage(event) {
    var el = document.createElement("p");
    var txtNode = document.createTextNode(event.data);
    
    el.appendChild(txtNode);
    receiveBox.appendChild(el);
  }
  
  // Handle status changes on the receiver's channel.
  
  function handleReceiveChannelStatusChange(event) {
    if (receiveChannel) {
      console.log("Receive channel's status has changed to " +
                  receiveChannel.readyState);
    }
    
    // Here you would do stuff that needs to be done
    // when the channel's status changes.
  }
  
  // Close the connection, including data channels if they're open.
  // Also update the UI to reflect the disconnected status.
  
  function disconnectPeers() {
  
    // Close the RTCDataChannels if they're open.
    
    sendChannel.close();
    receiveChannel.close();
    
    // Close the RTCPeerConnections
    
    localConnection.close();
    remoteConnection.close();

    sendChannel = null;
    receiveChannel = null;
    localConnection = null;
    remoteConnection = null;
    
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
