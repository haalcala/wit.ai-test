//Thanks to https://addpipe.com/simple-recorderjs-demo/


//connect to HTML elements
var recordButton = document.getElementById("record");
var stopButton = document.getElementById("stop");
var downloadLink = document.getElementById("download");
var audioElement = document.getElementById("audio");
var sendButton = document.getElementById("send");

recordButton.addEventListener("click", startRecording);
recordButton.disabled = false;
stopButton.addEventListener("click", stopRecording);


URL = window.URL || window.webkitURL;

//Recorder.js object
var rec;

//MediaStreamAudioSourceNode we'll be recording
var input;

// shim for AudioContext when it's not avb.
var AudioContext = window.AudioContext || window.webkitAudioContext;

//new audio context to help us record
var audioContext = new AudioContext({sampleRate: 16000});


function startRecording() {
  console.log("startButton clicked");

  audioElement.controls = false;
  recordButton.disabled = true;
  sendButton.disabled = true;
  stopButton.disabled = false;

  /* We're using the standard promise based getUserMedia()
https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia */

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: false
    })
    .then(function(stream) {
      console.log(
        "mic ready, start recording"
      );

      //fix for https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio
      audioContext.resume();
      input = audioContext.createMediaStreamSource(stream);
     
      // Create the Recorder object and configure to record mono sound (1 channel)
      // Wit AI only accepts mono
      rec = new Recorder(input, { numChannels: 1 });

      //start the recording process
      rec.record();
      console.log("Recording started");
    })
    .catch(function(err) {
      //if there was an error getting the mic
      console.log("ERR getting the mic:  " + err);
    });
}


function stopRecording() {
  console.log("stopButton clicked");

  stopButton.disabled = true;
  recordButton.disabled = false;

  rec.stop(); //stop microphone access
  rec.exportWAV(storeAudio);
}


function storeAudio(audioBlob) {
  var url = URL.createObjectURL(audioBlob);
  
  //create download link
  downloadLink.href = url;
  downloadLink.download = "Download.wav";
  downloadLink.innerHTML = downloadLink.download;

  //enable playback
  audioElement.controls = true;
  audioElement.src = url;

  sendButton.disabled = false;
  stashedAudio = audioBlob;
}
