const socket = io();
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const userName = document.getElementById("userName");
const btnLogin = document.getElementById("btnLogin");
const loginForm = document.querySelector("#loginForm");
const divVideos = document.querySelector("#divVideos");
const usersList = document.querySelector("#usersList");

let current_user = null;
let localStream;
let remoteStream;
let users = [];

userName.addEventListener("keypress", function (event) {
  // Check if the Enter key (key code 13) is pressed
  if (event.key === "Enter") {
    loginUser();
  }
});
btnLogin.addEventListener("click", () => {
  loginUser();
});

const PeerConnection = (function () {
  /** @type {RTCPeerConnection} */
  let peerConnection;

  function createPeerConnection() {
    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      // event.streams[0].getTracks().forEach((track) => {
      //   remoteStream.addTrack();
      // });
      remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("icecandidate", event.candidate);
      }
    };

    return peerConnection;
  }

  return {
    getInstance: () => {
      if (!peerConnection) {
        return (peerConnection = createPeerConnection());
      }
      return peerConnection;
    },
  };
})();

function loginUser() {
  if (userName.value == "") {
    alert("Type your name");
  } else {
    loginForm.style.display = "none";
    divVideos.style.display = "block";
    socket.emit("user-join", userName.value);
  }
}

socket.on("user-join", (user_data) => {
  current_user = user_data;
});

socket.on("user-joined", (users_data) => {
  console.log("user-joined called");
  playLocalVideo();
  users = users_data;
  createUsersList();
});

function createUsersList() {
  usersList.innerHTML = "";
  users.forEach((user) => {
    createLi(user);
  });
}

function createLi(user) {
  const el = document.createElement("li");
  el.classList.add("list-group-item");

  let myhtml = `<div class='callbtn d-flex justify-content-between align-items-center'>`;
  myhtml += `<div>${user.name}</div>`;
  if (user.name == userName.value) {
    el.classList.add("nocallbtn");
  } else {
    el.classList.add("callbtn");
    myhtml += `<div><svg style="width: 24px; height: 24px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg></div>`;
  }
  myhtml += `</div>`;
  el.innerHTML = myhtml;
  if (user.name != userName.value) {
    el.addEventListener("click", async () => {
      console.log(user);

      /** @type {RTCPeerConnection} */
      const pc = PeerConnection.getInstance();
      const offer = await pc.createOffer();
      console.log("offer", offer);
      await pc.setLocalDescription(offer);
      socket.emit("offer", {
        from: current_user,
        to: user,
        offer,
      });
    });
  }

  usersList.appendChild(el);
}

async function playLocalVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    localStream = stream;
    localVideo.srcObject = localStream;
  } catch (err) {
    console.error("Error accessing media devices.", err);
    alert("Could not access webcam and microphone. Please allow access.");
  }
}
// playLocalVideo();

// offer

socket.on("offer", async ({ from, to, offer }) => {
  if (!offer) {
    console.log("error in offer");
    return;
  }
  try {
    /** @type {RTCPeerConnection} */
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", { from, to, answer: pc.localDescription });
    console.log("answer");
    console.log(answer);
  } catch (err) {
    console.log("error detected in getting answer", err);
  }
});

socket.on("answer", async ({ from, to, answer }) => {
  console.log("in answer");
  console.log(answer);
  /** @type {RTCPeerConnection} */
  const pc = PeerConnection.getInstance();
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("icecandidate", async (candidate) => {
  console.log("ICE candidate received:", candidate);
  /** @type {RTCPeerConnection} */
  const pc = PeerConnection.getInstance();
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});
