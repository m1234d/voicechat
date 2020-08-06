connection = new WebSocket('wss://181084299f6d.ngrok.io/ws'); 

// get DOM elements
var dataChannelLog = document.getElementById('data-channel');

var thisUser= "";

var otherUser, myConnection;

var dataChannel = null;

function login() {
    thisUser = document.getElementById('username').value
    message = { 
        type: "login", 
        username: thisUser
    }
    connection.send(JSON.stringify(message)); 
}

function connectToUser() {
    targetUser = document.getElementById('otheruser').value
    otherUser = targetUser
    openDataChannel();

    myConnection.createOffer(function (offer) { 
        console.log("Sending offer..."); 
        message = { 
           type: "offer",
           offer: offer,
           username: thisUser,
           target: otherUser
        }
        connection.send(JSON.stringify(message))
           
        return myConnection.setLocalDescription(offer); 
     }, function (error) { 
        alert("An error has occurred."); 
     })


}

function onOffer(offer, thisUser, otherUser1) { 
    console.log(otherUser1)
    otherUser = otherUser1;
    console.log("Received offer!")
    console.log(otherUser)
    myConnection.ondatachannel = receiveChannelCallback;
    myConnection.setRemoteDescription(new RTCSessionDescription(offer)).then(function() {
        
        return myConnection.createAnswer(function (answer) { 
            myConnection.setLocalDescription(answer).then(function() {
                message = { 
                    type: "answer", 
                    answer: answer,
                    username: thisUser,
                    target: otherUser
                 };
                 console.log(myConnection)
                 connection.send(JSON.stringify(message))
                 return
            })
     
              
         }, function (error) { 
            alert("oops...error"); 
         }); 
    }).then(function() {
        document.getElementById("message").disabled = false;
        document.getElementById("login").disabled = true;
        document.getElementById("connect").disabled = true;
        document.getElementById("status").innerHTML = "Connected!";
    });
 }
   
 //when another user answers to our offer 
 function onAnswer(answer) { 
    console.log("Received answer!")
    console.log(otherUser)
    myConnection.setRemoteDescription(new RTCSessionDescription(answer)).then(function() {
        console.log(myConnection);
        document.getElementById("message").disabled = false;
        document.getElementById("login").disabled = true;
        document.getElementById("connect").disabled = true;
        document.getElementById("status").innerHTML = "Connected!";

        return
    })
 } 
  
 //when we got ice candidate from another user 
 function onCandidate(candidate) { 
    myConnection.addIceCandidate(new RTCIceCandidate(candidate)); 
 }	

connection.onmessage = function (message) { 
    console.log("Got message", message.data);
    var data = JSON.parse(message.data); 
     
    switch(data.type) { 
       case "login": 
          onLogin(data.success); 
          break; 
       case "offer": 
          onOffer(data.offer, data.target, data.username); 
          break; 
       case "answer": 
          onAnswer(data.answer); 
          break; 
       case "candidate": 
          onCandidate(data.candidate); 
          break; 
       default: 
          break; 
    } 
 };

 function onLogin(success) { 

    if (success === false) { 
       alert("oops...try a different username"); 
    } else { 
       //creating our RTCPeerConnection object 
    
       navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(function (stream) { 			
        //displaying local audio stream on the page
       
        var configuration = { 
          "iceServers": [{ "url": "stun:stun.1.google.com:19302" }, { "url": "turn:54.87.216.178:3478", "username": 'matt', 'credential': 'pass'}] 
        }; 
            
        myConnection = new RTCPeerConnection(configuration); 
        console.log("RTCPeerConnection object was created"); 
        console.log(myConnection); 
    
        myConnection.addStream(stream); 
                
        //when a remote user adds stream to the peer connection, we display it 
        myConnection.onaddstream = function (e) { 
            remoteAudio.srcObject = e.stream; 
        }; 
        //setup ice handling
        //when the browser finds an ice candidate we send it to another peer 
        myConnection.onicecandidate = function (event) { 
            
            if (event.candidate) { 
                console.log(thisUser, otherUser)
                message = { 
                    type: "candidate", 
                    candidate: event.candidate,
                    username: thisUser,
                    target: otherUser
                }
                connection.send(JSON.stringify(message))

            }
        };
        document.getElementById("connect").disabled = false;
        document.getElementById("login").disabled = true;
        document.getElementById("status").innerHTML = "Logged in!";
    }, function (error) { 
        console.log(error); 
     })
    } 
 };

 function sendMessage() {
    msg = document.getElementById('msgInput').value
    console.log("send message: ", msg);
    dataChannelLog.textContent += thisUser + ' > ' + msg + '\n';
    dataChannel.send(msg); 
 }

 function openDataChannel() { 

    var dataChannelOptions = { 
       reliable:true 
    }; 
    
    dataChannel = myConnection.createDataChannel("myDataChannel");
     
    dataChannel.onclose = function() {
        dataChannelLog.textContent += '- close\n';
    };
    dataChannel.onopen = function() {
        dataChannelLog.textContent += '- open\n';
    };
    dataChannel.onmessage = function(evt) {
        dataChannelLog.textContent += otherUser + ' < ' + evt.data + '\n';
    };
 }

 function receiveChannelCallback(event) {
    dataChannel = event.channel;
    dataChannel.onclose = function() {
        dataChannelLog.textContent += '- close\n';
    };
    dataChannel.onopen = function() {
        dataChannelLog.textContent += '- open\n';
    };
    dataChannel.onmessage = function(evt) {
        dataChannelLog.textContent += otherUser + ' < ' + evt.data + '\n';
    };
  }

function createPeerConnection() {
    var config = {
        sdpSemantics: 'unified-plan'
    };

    if (document.getElementById('use-stun').checked) {
        config.iceServers = [{urls: ['stun:stun.l.google.com:19302']}];
    }

    pc = new RTCPeerConnection(config);

    // register some listeners to help debugging
    pc.addEventListener('icegatheringstatechange', function() {
        iceGatheringLog.textContent += ' -> ' + pc.iceGatheringState;
    }, false);
    iceGatheringLog.textContent = pc.iceGatheringState;

    pc.addEventListener('iceconnectionstatechange', function() {
        iceConnectionLog.textContent += ' -> ' + pc.iceConnectionState;
    }, false);
    iceConnectionLog.textContent = pc.iceConnectionState;

    pc.addEventListener('signalingstatechange', function() {
        signalingLog.textContent += ' -> ' + pc.signalingState;
    }, false);
    signalingLog.textContent = pc.signalingState;

    // connect audio / video
    pc.addEventListener('track', function(evt) {
        if (evt.track.kind == 'video')
            document.getElementById('video').srcObject = evt.streams[0];
        else
            document.getElementById('audio').srcObject = evt.streams[0];
    });

    return pc;
}

function negotiate() {
    return pc.createOffer().then(function(offer) {
        return pc.setLocalDescription(offer);
    }).then(function() {
        // wait for ICE gathering to complete
        return new Promise(function(resolve) {
            if (pc.iceGatheringState === 'complete') {
                resolve();
            } else {
                function checkState() {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                }
                pc.addEventListener('icegatheringstatechange', checkState);
            }
        });
    }).then(function() {
        var offer = pc.localDescription;
      
        document.getElementById('offer-sdp').textContent = offer.sdp;
        return fetch('/offer', {
            body: JSON.stringify({
                sdp: offer.sdp,
                type: offer.type,
                video_transform: document.getElementById('video-transform').value
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });
    }).then(function(response) {
        return response.json();
    }).then(function(answer) {
        document.getElementById('answer-sdp').textContent = answer.sdp;
        return pc.setRemoteDescription(answer);
    }).catch(function(e) {
        alert(e);
    });
}

function start() {
    document.getElementById('start').style.display = 'none';

    pc = createPeerConnection();

    var time_start = null;

    function current_stamp() {
        if (time_start === null) {
            time_start = new Date().getTime();
            return 0;
        } else {
            return new Date().getTime() - time_start;
        }
    }

    if (document.getElementById('use-datachannel').checked) {
        var parameters = JSON.parse(document.getElementById('datachannel-parameters').value);

        dc = pc.createDataChannel('chat', parameters);
        dc.onclose = function() {
            clearInterval(dcInterval);
            dataChannelLog.textContent += '- close\n';
        };
        dc.onopen = function() {
            dataChannelLog.textContent += '- open\n';
            dcInterval = setInterval(function() {
                var message = 'ping ' + current_stamp();
                dataChannelLog.textContent += '> ' + message + '\n';
                dc.send(message);
            }, 1000);
        };
        dc.onmessage = function(evt) {
            dataChannelLog.textContent += '< ' + evt.data + '\n';

            if (evt.data.substring(0, 4) === 'pong') {
                var elapsed_ms = current_stamp() - parseInt(evt.data.substring(5), 10);
                dataChannelLog.textContent += ' RTT ' + elapsed_ms + ' ms\n';
            }
        };
    }

    var constraints = {
        audio: document.getElementById('use-audio').checked,
        video: false
    };

    if (document.getElementById('use-video').checked) {
        var resolution = document.getElementById('video-resolution').value;
        if (resolution) {
            resolution = resolution.split('x');
            constraints.video = {
                width: parseInt(resolution[0], 0),
                height: parseInt(resolution[1], 0)
            };
        } else {
            constraints.video = true;
        }
    }

    if (constraints.audio || constraints.video) {
        if (constraints.video) {
            document.getElementById('media').style.display = 'block';
        }
        navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
            stream.getTracks().forEach(function(track) {
                pc.addTrack(track, stream);
            });
            return negotiate();
        }, function(err) {
            alert('Could not acquire media: ' + err);
        });
    } else {
        negotiate();
    }

    document.getElementById('stop').style.display = 'inline-block';
}

function stop() {
    document.getElementById('stop').style.display = 'none';

    // close data channel
    if (dc) {
        dc.close();
    }

    // close transceivers
    if (pc.getTransceivers) {
        pc.getTransceivers().forEach(function(transceiver) {
            if (transceiver.stop) {
                transceiver.stop();
            }
        });
    }

    // close local audio / video
    pc.getSenders().forEach(function(sender) {
        sender.track.stop();
    });

    // close peer connection
    setTimeout(function() {
        pc.close();
    }, 500);
}
