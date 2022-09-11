const socket = io('/');
const myPeer = new Peer();

let activeView = '', btnActiveClass = 'text-blue-400';
const mediaAlert = document.getElementById('mediaAlert');
const mediaAlertDismiss = document.getElementById('dismissBtn');
const infoBtn = document.getElementById('chatInfoBtn');
const infoPanel = document.getElementById('infoPanel');
const participantsBtn = document.getElementById('participantsBtn');
const participantsPanel = document.getElementById('participantsPanel');
const userList = document.getElementById('participantsList');
const chatBtn = document.getElementById('chatBtn');
const chatPanel = document.getElementById('chatPanel');
const videoGrid = document.querySelector('#videoGrid');
const chatsContainer = document.getElementById('chats-container');
const messageForm = document.getElementById('send-form');
const messageInput = document.getElementById('message-input');

const videoBtn = document.getElementById('btnVideo');
const audioBtn = document.getElementById('btnAudio');


const showPanel = (view) => {
  document.querySelectorAll('.sidepanel').forEach(el => el.classList.add('hidden'));
  document.querySelector('.sidepanel-flex').classList.add('hidden');
  document.querySelectorAll('.xtrabtns').forEach(el => el.classList.remove(btnActiveClass));
  switch (view) {
    case 'info':
      if (activeView !== 'info') {
        infoPanel.classList.remove('hidden');
        infoBtn.classList.add(btnActiveClass);
        activeView = 'info'
      } else {
        infoPanel.classList.add('hidden');
        infoBtn.classList.remove(btnActiveClass);
        activeView = ''
      }
      break;
    case 'participants':
      if (activeView !== 'participants') {
        participantsPanel.classList.remove('hidden');
        participantsBtn.classList.add(btnActiveClass);
        activeView = 'participants'
      } else {
        participantsPanel.classList.add('hidden');
        participantsBtn.classList.remove(btnActiveClass);
        activeView = ''
      }
      break;
    case 'chat':
      if (activeView !== 'chat') {
        chatPanel.classList.remove('hidden');
        chatBtn.classList.add(btnActiveClass);
        activeView = 'chat';
      } else {
        chatPanel.classList.add('hidden');
        chatBtn.classList.remove(btnActiveClass);
        activeView = '';
      }
      break;
    default:
      break;
  }
}

document.onselectstart = function (e) {
  e.preventDefault();
  return false;
}

const peers = {};
let autoscroll = true;
const myVideo = document.createElement('video');
let myVideoStream;

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
      videoBtn.classList.remove('media-btn__off');
      videoBtn.classList.add('media-btn__on');
    } else {
      videoBtn.classList.remove('media-btn__on');
      videoBtn.classList.add('media-btn__off');
    }

    if (audio) {
      audioBtn.classList.remove('media-btn__off');
      audioBtn.classList.add('media-btn__on');
    } else {
      audioBtn.classList.remove('media-btn__on')
      audioBtn.classList.add('media-btn__off');
    }

    addVideoStream(myVideo, stream);

    myPeer.on('call', (call) => {
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('user-connected', ({ userId, userName }) => {
      socket.emit('user-check', roomId);
      connectToNewUser(userId, stream);
    });

    socket.on('chat-message', ({ message, name, msgTime }) => {
      appendMessage(message, name, msgTime);
    });

    socket.on('attendance', ({ users }) => {
      updateUserList(users);
    });
  })
  .catch((err) => {
    console.log(err);
    mediaAlert.classList.remove('hidden')
    mediaAlert.classList.add('flex')
  });

mediaAlertDismiss.addEventListener('click', () => {
  mediaAlert.classList.remove('flex')
  mediaAlert.classList.add('hidden')
})

myPeer.on('open', (id) => {
  var userName = sessionStorage.getItem('U');
  if (!userName) {
    userName = prompt('What is your name?');
  }
  if (!userName) userName = 'Unknown';
  setMyName(userName)
  socket.emit('join-room', roomId, id, userName);
  socket.emit('user-check', roomId);
});

socket.on('user-disconnected', ({ userId, users }) => {
  if (peers[userId]) {
    peers[userId].close();
    socket.emit('user-check', roomId);
    delete users[userId];
    document.getElementById(`u-${userId}`).remove();
    updateUserList(users);
  }
});

socket.on('ended', () => {
  const endAlert = document.getElementById('endAlert');
  endAlert.classList.remove('hidden');
  endAlert.classList.add('flex');

  var meetingEndButton = document.querySelector('#returnHomeBtn');
  meetingEndButton.addEventListener('click', () => {
    window.location.replace('/');
  })

});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId);
  });
  call.on('close', () => {
    const parent = video.closest('.user-video');
    video.remove();
    parent.remove();
  });
  peers[userId] = call;
}

function getUserMediaSettings() {
  const audio = sessionStorage.getItem('user-audio');
  const video = sessionStorage.getItem('user-video');
  const noAudio = (audio && audio == 'off') ? true : false;
  const noVideo = (video && video == 'off') ? true : false;
  return { video: !noVideo, audio: !noAudio }
}

function setMyName(uname) {
  let initial = '';
  let name = uname.split(' ');
  if (name.length > 1) {
    initial = name[0].charAt(0) + name[1].charAt(0);
  } else {
    initial = name[0].charAt(0) + name[0].charAt(1);
  }
  const user = document.createElement('div');
  user.className = 'item';
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.innerText = initial.toUpperCase();
  const username = document.createElement('span');
  username.className = 'name';
  username.innerText = uname;
  user.append(avatar, username);
  userList.append(user);
}

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    sessionStorage.setItem('user-audio', 'off');
    audioBtn.classList.remove('media-btn__on')
    audioBtn.classList.add('media-btn__off');
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    sessionStorage.setItem('user-audio', 'on');
    audioBtn.classList.remove('media-btn__off');
    audioBtn.classList.add('media-btn__on');
  }
};

const cameraOnOff = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    sessionStorage.setItem('user-video', 'off');
    videoBtn.classList.remove('media-btn__on');
    videoBtn.classList.add('media-btn__off');
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    sessionStorage.setItem('user-video', 'on');
    videoBtn.classList.remove('media-btn__off');
    videoBtn.classList.add('media-btn__on');
  }
};

messageInput.addEventListener("keyup", function (event) {
  if (event.code === 'Enter') {
    event.preventDefault();
    const message = messageInput.value;
    appendMessage(message, 'me', new Date().getTime())
    socket.emit('send-chat-message', roomId, message);
    messageInput.value = '';
    return;
  }
  const message = messageInput.value;
  if (message != "") {
    document.getElementById('send-button').removeAttribute("disabled");
  } else {
    document.getElementById('send-button').setAttribute("disabled", null);
  }
});

document.getElementById('send-button').addEventListener("click", function (event) {
  const message = messageInput.value;
  messageInput.value = '';
  appendMessage(message, 'me', new Date().getTime())
  socket.emit('send-chat-message', roomId, message);
});

function addVideoStream(video, stream, userId) {
  if (stream && video) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      video.play();
    });
    video.classList.add("w-full", 'h-full', 'object-cover')
    const userVideo = document.createElement('div');
    userVideo.classList.add('user-video');
    if (userId) {
      userVideo.setAttribute('id', `u-${userId}`)
    }
    userVideo.append(video);
    videoGrid.append(userVideo);
  }
}

function updateUserList(users) {
  const allUsers = [];
  userList.innerHTML = '';
  videoGrid.classList = '';
  for (var key of Object.keys(users)) {
    allUsers.push({
      id: key,
      name: users[key],
    });
  }
  document.getElementById('participantsCount').innerText = allUsers.length;
  videoGrid.classList.add('video-grid', `user-${allUsers.length}`)
  allUsers.forEach((u) => {
    let initial = '';
    let name = u.name.split(' ');
    if (name.length > 1) {
      initial = name[0].charAt(0) + name[1].charAt(0);
    } else {
      initial = name[0].charAt(0) + name[0].charAt(1);
    }
    const user = document.createElement('div');
    user.className = 'item';
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerText = initial.toUpperCase();
    const username = document.createElement('span');
    username.className = 'name';
    username.innerText = u.name;
    user.append(avatar, username);
    userList.append(user);
  });
}

function appendMessage(message, sender, msgTime) {

  const messageElement = document.createElement('div');
  messageElement.className = 'item';

  const messageText = `<span class="name">${sender == 'me' ? 'You' : sender} <small>${getMessageTime(msgTime)}</small></span><div class="message">${message}</div>`;

  messageElement.innerHTML = messageText;
  chatsContainer.append(messageElement);

  if (autoscroll) {
    chatsContainer.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
}

function getMessageTime(time) {
  const today = new Date(time);

  let h = today.getHours(), m = today.getMinutes();
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

  m = (m < 10) ? "0" + m : m;
  return h + ":" + m + " " + session;
}

const endCall = () => {
  if (confirm('Hang up current call?')) window.location.replace('/');
};

var elem = document.getElementById("videoUI");
function openFullscreen() {
  if (document.fullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { /* Firefox */
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE/Edge */
      document.msExitFullscreen();
    }
  } else {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
      elem.msRequestFullscreen();
    }
  }
}

const copyToClipboard = str => {
  const el = document.createElement('textarea');
  el.value = str;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  var x = document.getElementById("snackbar");
  x.innerText = 'Chatroom link copied to clipboard.';
  x.className = "show";
  setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);
};

function searchParticipants() {

  let input, filter, ul, li, i;
  input = document.getElementById('searchInput');
  filter = input.value.toUpperCase();
  ul = document.getElementById("participantsList");
  li = ul.getElementsByClassName('item');

  for (i = 0; i < li.length; i++) {
    if (li[i].textContent.toUpperCase().indexOf(filter) > -1) {
      li[i].style.display = "";
    } else {
      li[i].style.display = "none";
    }
  }
}

showTime(false);