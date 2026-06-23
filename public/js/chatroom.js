const socket = io("/");
const myPeer = new Peer();

let activeView = "",
  btnActiveClass = "text-blue-400";
const mediaAlert = document.getElementById("mediaAlert");
const mediaAlertDismiss = document.getElementById("dismissBtn");
const infoBtn = document.getElementById("chatInfoBtn");
const infoPanel = document.getElementById("infoPanel");
const participantsBtn = document.getElementById("participantsBtn");
const participantsPanel = document.getElementById("participantsPanel");
const userList = document.getElementById("participantsList");
const chatBtn = document.getElementById("chatBtn");
const chatPanel = document.getElementById("chatPanel");
const videoGrid = document.querySelector("#videoGrid");
const chatsContainer = document.getElementById("chats-container");
const messageForm = document.getElementById("send-form");
const messageInput = document.getElementById("message-input");

const videoBtn = document.getElementById("btnVideo");
const audioBtn = document.getElementById("btnAudio");

// Clean up and populate the absolute invitation data on window load
const fullInvitationUrl = `${window.location.origin}/join/${roomId}`;
const urlInputField = document.getElementById("roomUrlInput");
const copyButtonTrigger = document.getElementById("copyLinkBtn");

if (urlInputField) {
  urlInputField.value = fullInvitationUrl;
}

if (copyButtonTrigger) {
  copyButtonTrigger.onclick = () => {
    copyToClipboard(fullInvitationUrl);
  };
}

const showPanel = (view) => {
  document
    .querySelectorAll(".sidepanel")
    .forEach((el) => el.classList.add("hidden"));
  document.querySelector(".sidepanel-flex").classList.add("hidden");
  document
    .querySelectorAll(".xtrabtns")
    .forEach((el) => el.classList.remove(btnActiveClass));
  switch (view) {
    case "info":
      if (activeView !== "info") {
        infoPanel.classList.remove("hidden");
        infoBtn.classList.add(btnActiveClass);
        activeView = "info";
      } else {
        infoPanel.classList.add("hidden");
        infoBtn.classList.remove(btnActiveClass);
        activeView = "";
      }
      break;
    case "participants":
      if (activeView !== "participants") {
        participantsPanel.classList.remove("hidden");
        participantsBtn.classList.add(btnActiveClass);
        activeView = "participants";
      } else {
        participantsPanel.classList.add("hidden");
        participantsBtn.classList.remove(btnActiveClass);
        activeView = "";
      }
      break;
    case "chat":
      if (activeView !== "chat") {
        chatPanel.classList.remove("hidden");
        chatBtn.classList.add(btnActiveClass);
        activeView = "chat";
      } else {
        chatPanel.classList.add("hidden");
        chatBtn.classList.remove(btnActiveClass);
        activeView = "";
      }
      break;
    default:
      break;
  }
};

document.onselectstart = function (e) {
  e.preventDefault();
  return false;
};

const peers = {};
let autoscroll = true;
const myVideo = document.createElement("video");
let myVideoStream;

// Sound helpers: try to play audio files in /sounds/
// otherwise fallback to generated beeps
let joinAudio = null,
  leaveAudio = null;

function loadAudio(url) {
  try {
    const a = new Audio(url);
    a.preload = "auto";
    a.volume = 0.6;
    return a;
  } catch (e) {
    return null;
  }
}

function playBeep(freq = 440, duration = 0.12) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.stop(ctx.currentTime + duration + 0.02);
    setTimeout(
      () => {
        try {
          ctx.close();
        } catch (e) {}
      },
      (duration + 0.05) * 1000,
    );
  } catch (e) {}
}

function playJoinSound() {
  if (!joinAudio) joinAudio = loadAudio("/sounds/join.wav");
  if (joinAudio) {
    try {
      joinAudio.currentTime = 0;
      joinAudio.play().catch(() => {});
      return;
    } catch (e) {}
  }
  playBeep(660, 0.08);
  setTimeout(() => playBeep(880, 0.1), 90);
}

function playLeaveSound() {
  if (!leaveAudio) leaveAudio = loadAudio("/sounds/leave.wav");
  if (leaveAudio) {
    try {
      leaveAudio.currentTime = 0;
      leaveAudio.play().catch(() => {});
      return;
    } catch (e) {}
  }
  playBeep(320, 0.14);
}

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;

    const { video, audio } = getUserMediaSettings();

    myVideoStream.getAudioTracks()[0].enabled = audio;
    myVideoStream.getVideoTracks()[0].enabled = video;

    if (video) {
      videoBtn.classList.remove("media-btn__off");
      videoBtn.classList.add("media-btn__on");
    } else {
      videoBtn.classList.remove("media-btn__on");
      videoBtn.classList.add("media-btn__off");
    }

    if (audio) {
      audioBtn.classList.remove("media-btn__off");
      audioBtn.classList.add("media-btn__on");
    } else {
      audioBtn.classList.remove("media-btn__on");
      audioBtn.classList.add("media-btn__off");
    }

    addVideoStream(myVideo, stream);

    try {
      myVideo.muted = true;
    } catch (e) {}

    myPeer.on("call", (call) => {
      console.debug(
        "[peer] incoming call from",
        call.peer,
        "answering with local tracks",
        stream && stream.getTracks ? stream.getTracks().length : 0,
      );
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        console.debug(
          "[peer] received remote stream from",
          call.peer,
          "tracks",
          userVideoStream && userVideoStream.getTracks
            ? userVideoStream.getTracks().length
            : 0,
        );
        addVideoStream(video, userVideoStream, call.peer);
      });
    });

    socket.on("user-connected", ({ userId, userName }) => {
      socket.emit("user-check", roomId);
      console.debug(
        "[socket] user-connected event, attempting to call",
        userId,
      );
      connectToNewUser(userId, stream);
      try {
        playJoinSound();
      } catch (e) {}
    });

    socket.on("chat-message", ({ message, name, msgTime }) => {
      if (message.trim().length > 0) {
        appendMessage(message, name, msgTime);
      }
    });

    socket.on("attendance", ({ users }) => {
      updateUserList(users);
    });

    socket.on("remote-audio-toggled", ({ userId, isMuted }) => {
      const remoteTile = document.getElementById(`u-${userId}`);
      if (remoteTile) {
        if (isMuted) {
          remoteTile.setAttribute("data-audio", "off");
        } else {
          remoteTile.removeAttribute("data-audio");
        }
      }
    });
  })
  .catch((err) => {
    console.log(err);
    mediaAlert.classList.remove("hidden");
    mediaAlert.classList.add("flex");
  });

mediaAlertDismiss.addEventListener("click", () => {
  mediaAlert.classList.remove("flex");
  mediaAlert.classList.add("hidden");
});

myPeer.on("open", (id) => {
  var userName = sessionStorage.getItem("U");
  if (!userName) {
    userName = prompt("What is your name?");
  }
  if (!userName) userName = "Unknown";
  setMyName(userName);
  socket.emit("join-room", roomId, id, userName);
  socket.emit("user-check", roomId);
});

socket.on("user-disconnected", ({ userId, users }) => {
  // Always attempt to remove the peer and the DOM tile if present.
  // This prevents trying to call .remove() on null and leaves no black tiles.
  try {
    if (peers[userId]) {
      try {
        peers[userId].close();
      } catch (e) {}
      delete peers[userId];
    }
  } catch (e) {}

  // Safely remove the user's video tile if it exists
  try {
    const tile = document.getElementById(`u-${userId}`);
    if (tile && typeof tile.remove === "function") tile.remove();
  } catch (e) {}

  // Update the attendance UI using the server-supplied users list if available
  try {
    if (users) {
      // server may include the updated list; use it
      updateUserList(users);
    } else {
      // fallback: ask server for current attendance
      socket.emit("user-check", roomId);
    }
  } catch (e) {}

  try {
    playLeaveSound();
  } catch (e) {}
});

socket.on("ended", () => {
  // 1. Find and remove your dangling local video preview tile container
  const localTile = document.getElementById("u-local");
  if (localTile && localTile.parentNode) {
    localTile.parentNode.removeChild(localTile);
  }

  // 2. Safely stop your local camera track inputs from running in the background
  if (myVideoStream) {
    myVideoStream.getTracks().forEach((track) => track.stop());
  }

  // 3. Reveal the full-screen modal alert layer as normal
  const endAlertModal = document.getElementById("endAlert");
  endAlertModal.style.display = "flex";

  // 4. Handle redirecting the user back home when clicking the alert button
  // In room.ejs, the button has the selector role="button" but lacks an explicit ID.
  // We can target it safely inside the #endAlert wrapper container.
  const homeBtn =
    endAlertModal.querySelector('[role="button"]') ||
    document.getElementById("dismissBtn");
  if (homeBtn) {
    homeBtn.onclick = () => {
      window.location.href = "/";
    };
  }
});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId);
  });
  call.on("close", () => {
    // Clean up the video element and its container safely
    try {
      const parent = video.closest(".user-video");
      if (video && typeof video.remove === "function") video.remove();
      if (parent && typeof parent.remove === "function") parent.remove();
    } catch (e) {}
    // Ensure we don't keep a stale reference to the peer call
    try {
      if (peers[userId]) delete peers[userId];
    } catch (e) {}
    // Re-evaluate layout after removal
    try {
      normalizeTwoPersonLayout();
    } catch (e) {}
  });
  peers[userId] = call;
}

function getUserMediaSettings() {
  const audio = sessionStorage.getItem("user-audio");
  const video = sessionStorage.getItem("user-video");
  const noAudio = audio && audio == "off" ? true : false;
  const noVideo = video && video == "off" ? true : false;
  return { video: !noVideo, audio: !noAudio };
}

function setMyName(uname) {
  let initial = "";
  let name = uname.split(" ");
  if (name.length > 1) {
    initial = name[0].charAt(0) + name[1].charAt(0);
  } else {
    initial = name[0].charAt(0) + name[0].charAt(1);
  }
  const user = document.createElement("div");
  user.className = "item";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.innerText = initial.toUpperCase();
  const username = document.createElement("span");
  username.className = "name";
  username.innerText = uname;
  user.append(avatar, username);
  userList.append(user);
}

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  const localTile = document.getElementById("u-local");

  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    sessionStorage.setItem("user-audio", "off");
    audioBtn.classList.remove("media-btn__on");
    audioBtn.classList.add("media-btn__off");

    if (localTile) localTile.setAttribute("data-audio", "off");

    // Send muted state to other participants
    socket.emit("toggle-audio-state", true);
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    sessionStorage.setItem("user-audio", "on");
    audioBtn.classList.remove("media-btn__off");
    audioBtn.classList.add("media-btn__on");

    if (localTile) localTile.removeAttribute("data-audio");

    // Send unmuted state to other participants
    socket.emit("toggle-audio-state", false);
  }
};

const cameraOnOff = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  const localTile = document.getElementById("u-local");

  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    sessionStorage.setItem("user-video", "off");
    videoBtn.classList.remove("media-btn__on");
    videoBtn.classList.add("media-btn__off");

    // REQ 3: Set attribute to hide video track and display the avatar overlay
    if (localTile) localTile.setAttribute("data-camera", "off");
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    sessionStorage.setItem("user-video", "on");
    videoBtn.classList.remove("media-btn__off");
    videoBtn.classList.add("media-btn__on");

    // REQ 3: Remove attribute to display active camera feed again
    if (localTile) localTile.removeAttribute("data-camera");
  }
};

messageInput.addEventListener("keyup", function (event) {
  if (event.code === "Enter") {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message.length == 0) return;
    appendMessage(message, "me", new Date().getTime());
    socket.emit("send-chat-message", roomId, message);
    messageInput.value = "";
    return;
  }
  const message = messageInput.value;
  if (message != "") {
    document.getElementById("send-button").removeAttribute("disabled");
  } else {
    document.getElementById("send-button").setAttribute("disabled", null);
  }
});

document
  .getElementById("send-button")
  .addEventListener("click", function (event) {
    const message = messageInput.value.trim();
    if (message.length == 0) return;
    messageInput.value = "";
    appendMessage(message, "me", new Date().getTime());
    socket.emit("send-chat-message", roomId, message);
  });

function addVideoStream(video, stream, userId) {
  // Only append when we actually have an active stream component
  if (!stream || !video) return;

  // Deduplicate: If a tile for this user already exists, safely clear it out
  try {
    const tileId = userId ? `u-${userId}` : "u-local";
    const existing = document.getElementById(tileId);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  } catch (e) {
    console.error("[DOM Cleanup Error]", e);
  }

  // Bind the media tracks to the raw video element node
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play().catch((err) => console.warn("[Video Autoplay Blocked]", err));
  });
  video.classList.add("w-full", "h-full", "object-cover");

  // Create the parent wrapper block configured to respond to our chatroom.css layout
  const userVideo = document.createElement("div");
  userVideo.classList.add("user-video");
  userVideo.setAttribute("id", userId ? `u-${userId}` : "u-local");

  // Generate dynamic initials for the user's explicit avatar block
  let userInitials = "??";
  if (!userId) {
    // Local User fallback name generation
    const localName = sessionStorage.getItem("U") || "Me";
    const nameParts = localName.trim().split(" ");
    userInitials =
      nameParts.length > 1
        ? (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase()
        : localName.slice(0, 2).toUpperCase();
  }

  userVideo.innerHTML = `
    <div class="audio-mute-badge">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="white" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6L4.5 9H1.5v6h3l4.5 3.75V3.75z" />
      </svg>
    </div>

    <div class="video-slot absolute inset-0 w-full h-full z-0 flex items-center justify-center">
    </div>
    
    <div class="avatar-fallback flex-col gap-3">
      <div class="rounded-full bg-primary flex items-center justify-center font-bold border-2 border-neutral-600 shadow-md text-white" style="aspect-ratio:1;height:50px">
        <span class="avatar-initials-placeholder" data-peer="${userId || "local"}">${userInitials}</span>
      </div>
      <p class="text-sm text-neutral-400 font-medium tracking-wide avatar-name-placeholder" data-peer="${userId || "local"}">
        ${!userId ? "You" : "Loading User..."}
      </p>
    </div>
  `;

  userVideo.querySelector(".video-slot").appendChild(video);

  // Throw the completed layout tile bundle onto your smart videoGrid view container frame
  videoGrid.append(userVideo);

  if (!userId) {
    makeElementDraggable(userVideo);
  }

  // Trigger state evaluation calculations to handle structural changes cleanly
  updateParticipantCountAttribute();
}

function updateParticipantCountAttribute() {
  const totalTiles = videoGrid.querySelectorAll(".user-video").length;

  // Instantly changes grid distribution styles via our custom data attribute in chatroom.css
  videoGrid.setAttribute("data-count", totalTiles || 1);

  // Run your existing two-person logic rules as secondary operations
  if (typeof normalizeTwoPersonLayout === "function") {
    normalizeTwoPersonLayout();
  }
}

function updateUserList(users) {
  const allUsers = [];
  userList.innerHTML = "";

  for (var key of Object.keys(users)) {
    allUsers.push({
      id: key,
      name: users[key],
    });
  }

  document.getElementById("participantsCount").innerText = allUsers.length;

  // Clean out manual videoGrid structural rewrites so chatroom.css handles everything
  allUsers.forEach((u) => {
    let initial = "";
    let name = u.name.split(" ");
    if (name.length > 1) {
      initial = name[0].charAt(0) + name[1].charAt(0);
    } else {
      initial = name[0].charAt(0) + name[0].charAt(1);
    }

    // 1. Update the Text Participants List Panel UI
    const user = document.createElement("div");
    user.className = "item";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.innerText = initial.toUpperCase();
    const username = document.createElement("span");
    username.className = "name";
    username.innerText = u.name;
    user.append(avatar, username);
    userList.append(user);

    // 2. REQ 3: Find the corresponding video tile and populate its avatar properties
    const remoteTile = document.getElementById(`u-${u.id}`);
    if (remoteTile) {
      const initialsLabel = remoteTile.querySelector(
        `.avatar-initials-placeholder`,
      );
      const nameLabel = remoteTile.querySelector(`.avatar-name-placeholder`);

      if (initialsLabel) initialsLabel.innerText = initial.toUpperCase();
      if (nameLabel) nameLabel.innerText = u.name;
    }
  });

  // Re-verify the count attributes to preserve smart grid constraints
  updateParticipantCountAttribute();
}

function appendMessage(message, sender, msgTime) {
  const messageElement = document.createElement("div");
  messageElement.className = "item";

  const messageText = `<span class="name">${sender == "me" ? "You" : sender} <small>${getMessageTime(msgTime)}</small></span><div class="message">${message}</div>`;

  messageElement.innerHTML = messageText;
  chatsContainer.append(messageElement);

  if (autoscroll) {
    chatsContainer.scrollIntoView({ block: "end", behavior: "smooth" });
  }
}

function getMessageTime(time) {
  const today = new Date(time);

  let h = today.getHours(),
    m = today.getMinutes();
  let session = "AM";

  if (h === 0) {
    h = 12;
  }
  if (h >= 12) {
    session = "PM";
    if (h > 12) {
      h = h - 12;
    }
  }

  m = m < 10 ? "0" + m : m;
  return h + ":" + m + " " + session;
}

const endCall = () => {
  if (confirm("Hang up current call?")) window.location.replace("/");
};

var elem = document.getElementById("videoUI");
function openFullscreen() {
  if (document.fullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      /* Firefox */
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      /* IE/Edge */
      document.msExitFullscreen();
    }
  } else {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      /* Chrome, Safari & Opera */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      /* IE/Edge */
      elem.msRequestFullscreen();
    }
  }
}

// Modernized and secure text clipboard copy routine
const copyToClipboard = (str) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(str)
      .then(() => showSnackbarNotice())
      .catch(() => fallbackCopy(str));
  } else {
    fallbackCopy(str);
  }
};

function fallbackCopy(str) {
  const el = document.createElement("textarea");
  el.value = str;
  el.setAttribute("readonly", "");
  el.style.position = "absolute";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  showSnackbarNotice();
}

function showSnackbarNotice() {
  var x = document.getElementById("snackbar");
  if (!x) return;
  x.innerText = "Chatroom link copied to clipboard.";
  x.className = "show";
  setTimeout(function () {
    x.className = x.className.replace("show", "");
  }, 3000);
}

function searchParticipants() {
  let input, filter, ul, li, i;
  input = document.getElementById("searchInput");
  filter = input.value.toUpperCase();
  ul = document.getElementById("participantsList");
  li = ul.getElementsByClassName("item");

  for (i = 0; i < li.length; i++) {
    if (li[i].textContent.toUpperCase().indexOf(filter) > -1) {
      li[i].style.display = "";
    } else {
      li[i].style.display = "none";
    }
  }
}

function handleCopyInviteLink() {
  // 1. Build a clean URL string utilizing the server-provided global configurations
  // Trim any trailing slashes to prevent url gaps like "http://localhost:3000//room-id"
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const invitationLink = `${cleanBase}/${roomId}`;

  // 2. Pass the fully qualified link straight to your updated modern clipboard utility
  copyToClipboard(invitationLink);
}

showTime(false);

// ==========================================================================
// FLOATING VIDEO DRAG UTILITY (MOUSE & TOUCH SUPPORT)
// ==========================================================================
function makeElementDraggable(el) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  // Bind both pointer interactions
  el.onmousedown = dragStart;
  el.ontouchstart = dragStart;

  function dragStart(e) {
    // Only allow dragging if the window is actually floating (more than 1 participant)
    const countAttr = videoGrid.getAttribute("data-count");
    if (!countAttr || countAttr === "1") return;

    e = e || window.event;

    // Extract initial click/touch coordinates
    if (e.type === "touchstart") {
      pos3 = e.touches[0].clientX;
      pos4 = e.touches[0].clientY;
    } else {
      e.preventDefault(); // Prevents image/text selection ghosts on desktop
      pos3 = e.clientX;
      pos4 = e.clientY;
    }

    // Convert fixed bottom/right constraints into modifiable top/left bounds
    const rect = el.getBoundingClientRect();
    const parentRect = videoGrid.getBoundingClientRect();

    el.style.bottom = "auto";
    el.style.right = "auto";
    el.style.top = rect.top - parentRect.top + "px";
    el.style.left = rect.left - parentRect.left + "px";

    // Attach document-wide listeners so tracking doesn't break if mouse slips off tile
    document.onmouseup = dragEnd;
    document.ontouchend = dragEnd;
    document.onmousemove = dragMove;
    document.ontouchmove = dragMove;
  }

  function dragMove(e) {
    e = e || window.event;
    let clientX, clientY;

    if (e.type === "touchmove") {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate dynamic distance differentials
    pos1 = pos3 - clientX;
    pos2 = pos4 - clientY;
    pos3 = clientX;
    pos4 = clientY;

    // Shift inline style markers
    el.style.top = el.offsetTop - pos2 + "px";
    el.style.left = el.offsetLeft - pos1 + "px";
  }

  function dragEnd() {
    // Release tracking hooks completely
    document.onmouseup = null;
    document.ontouchend = null;
    document.onmousemove = null;
    document.ontouchmove = null;
  }
}

function updateParticipantCountAttribute() {
  const totalTiles = videoGrid.querySelectorAll(".user-video").length;

  // Instantly changes grid distribution styles via our custom data attribute in chatroom.css
  videoGrid.setAttribute("data-count", totalTiles || 1);

  // RESET LOGIC: If you return to solo mode, strip custom inline coordinates to restore normal layout constraints
  if (totalTiles <= 1) {
    const localTile = document.getElementById("u-local");
    if (localTile) {
      localTile.style.top = "";
      localTile.style.left = "";
      localTile.style.bottom = "";
      localTile.style.right = "";
    }
  }

  // Run your existing two-person logic rules as secondary operations
  if (typeof normalizeTwoPersonLayout === "function") {
    normalizeTwoPersonLayout();
  }
}
