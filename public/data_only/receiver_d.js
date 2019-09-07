(function() {

  // Define "global" variables
  
  var connectButton = null;
  var disconnectButton = null;
  var sendButton = null;
  var messageInputBox = null;
  var receiveBox = null;
  
  var receiver_connection = null;  // RTCPeerConnection for the "remote"
  
  var receiveChannel = null;    // RTCDataChannel for the remote (receiver)

  var signaling = null;
  var signaling_address = "ws://localhost:8082";
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

    receiver_connection = new RTCPeerConnection(STUN_config);
    receiver_connection.ondatachannel = receiveChannelCallback;

    // Setup signaling
    signaling = new WebSocket(signaling_address);
    signaling.sendBlob = function(payload) {
        console.log("Sending blob");
        console.log(payload);
        blob = JSON.stringify(payload);
        console.log(blob);
        this.send(blob);
    } 

// send any ice candidates to the other peer                                                                                                                                                                       
    receiver_connection.onicecandidate = function(e) {
      console.log("onicecandidate event fired");
      console.log(e);
      if(e.candidate)
      {
        console.log("SENDING THE CANDIDATE TO SENDER");
        payload = {candidate: e.candidate};
        signaling.sendBlob(payload);
      }
      else
      { 
        console.log("Dud candidate?");
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
            console.log("Got an offer");
            await receiver_connection.setRemoteDescription(desc);
            await receiver_connection.setLocalDescription(await receiver_connection.createAnswer());
            signaling.sendBlob({desc: receiver_connection.localDescription});
          } else if (desc.type === 'answer') {
            console.log("Got an answer");
            await receiver_connection.setRemoteDescription(desc);
          } else {
            console.log('Unsupported SDP type.');
          } 
        } else if (candidate) {
          console.log("RECEIVED A FUCKING CANDIDATE");
          await receiver_connection.addIceCandidate(candidate);
        } 
      } catch (err) {
        console.error(err);
      } 
    };

  }


  // Connect the two peers. Normally you look for and connect to a remote
  // machine here, but we're just connecting two local objects, so we can
  // bypass that step.
  
  function connectPeers() {
    // Create the remote connection and its event listeners
    

     
    
    // Now create an offer to connect; this starts the process
    // SMackey: OK this is going to be a bitch to separate
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

  // Called when the connection opens and the data
  // channel is ready to be connected to the remote.
  
  function receiveChannelCallback(event) {
    console.log("RECEIVED A FUCKING CHANNEL");
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleReceiveMessage;
    receiveChannel.onopen = handleReceiveChannelStatusChange;
    receiveChannel.onclose = handleReceiveChannelStatusChange;
  }
  
  // Handle onmessage events for the receiving channel.
  // These are the data messages sent by the sending channel.
  
  function handleReceiveMessage(event) {
    console.log("MESSAGE RECEIVED");
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
    
    receiveChannel.close();
    
    // Close the RTCPeerConnections
    
    receiver_connection.close();

    receiveChannel = null;
    receiver_connection = null;
    
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
