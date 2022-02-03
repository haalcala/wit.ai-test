var sendButton = document.getElementById("send");
sendButton.addEventListener("click", respondToAudio);


function respondToAudio() {
  var audioBlob = stashedAudio;
  setResponse("...");
  sendToGlitch(audioBlob).then(responseData => {
    setResponse(responseData);
  });
}


function sendToGlitch(dataBlob) {
  console.log("sendRequestToGlitch with data:");
  console.log(dataBlob);

  var formData = new FormData();
  formData.append("myfile", dataBlob);
  //formData.append("sanity", "i am crazy?");

  const url = "/upload";
  const params = {
    method: "POST",
    body: formData
  };
  return fetch(url, params).then(response => response.json());
}


function setResponse(data) {
  console.log("got response");
  document.getElementById("response").innerHTML =
    "<pre>" + JSON.stringify(data, null, 4) + "</pre>";
}
