const socket = io('/');

const videoGrid = document.getElementById('video-grid');
const videoController = document.getElementById('videos-controller');
const userList = document.getElementById('peopleList');
const messageContainer = document.getElementById('message-container');
const roomContainer = document.getElementById('room-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');

const myPeer = new Peer(undefined, {
  path: '/peerjs',
  host: '/',
  port: '3030',
});

const peers = {};
let myVideoStream;
let autoscroll = true;

const myVideo = document.createElement('video');

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    const muted = sessionStorage.getItem('NYSM_MUTE') || false;
    const btn = document.getElementById('btnAudio');
    myVideoStream.getAudioTracks()[0].enabled = !muted;
    if (muted) {
      btn.classList.add('no');
    } else {
      btn.classList.remove('no');
    }
    addVideoStream(myVideo, stream);

    myPeer.on('call', (call) => {
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('user-connected', (userId) => {
      connectToNewUser(userId, stream);
    });

    // socket.on('user-connected', ({ userName, userId, users, socketId }) => {
    //   connectToNewUser(userId, stream, socketId);
    //   broadcast(`${userName} joined`);
    //   updateUserList(users);
    // });

    // socket.on('chat-message', ({ message, name }) => {
    //   appendMessage(message, name);
    // });
  });

// socket.on('user-disconnected', ({ name, id, users }) => {
//   if (peers[id]) peers[id].close();
//   broadcast(`${name} left`);
//   updateUserList(users);
// });

// myPeer.on('open', (id) => {
//   var userName = sessionStorage.getItem('U');
//   if (!userName) {
//     userName = prompt('What is your name?');
//   }
//   socket.emit('join-room', roomId, id, userName);
//   broadcast('You joined');
// });

socket.on('user-disconnected', (userId) => {
  if (peers[userId]) peers[userId].close();
});

myPeer.on('open', (id) => {
  socket.emit('join-room', roomId, id);
});

// function connectToNewUser(userId, stream) {
//   const call = myPeer.call(userId, stream);
//   const video = document.createElement('video');
//   call.on('stream', (userVideoStream) => {
//     addVideoStream(video, userVideoStream);
//   });
//   call.on('close', () => {
//     video.remove();
//   });

//   peers[userId] = call;
// }

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream, socketId) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}

const muteUnmute = () => {
  // const enabled = myVideoStream.getAudioTracks()[0].enabled;
  const btn = document.getElementById('btnAudio');
  if (!btn.classList.contains('no')) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    btn.classList.add('no');
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    btn.classList.remove('no');
  }
};

const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  const btn = document.getElementById('btnVideo');
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    btn.classList.add('no');
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    btn.classList.remove('no');
  }
};

const endCall = () => {
  if (confirm('Hang up current call?')) window.location.replace('/');
};

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    appendMessage(message, 'me');
    socket.emit('send-chat-message', roomId, message);
    messageInput.value = '';
  }
});

function broadcast(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'broadcast';
  messageElement.innerText = message;
  messageContainer.append(messageElement);
}

function updateUserList(users) {
  const allUsers = [];
  for (var key of Object.keys(users)) {
    allUsers.push({
      id: key,
      name: users[key],
    });
  }
  userList.innerHTML = '';
  allUsers.forEach((u) => {
    let initial = '';
    let name = u.name.split(' ');
    if (name.length > 1) {
      initial = name[0].charAt(0) + name[1].charAt(0);
    } else {
      initial = name[0].charAt(0) + name[0].charAt(1);
    }

    const person = document.createElement('div');
    person.className = 'person';
    person.setAttribute('title', name);
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    const initials = document.createElement('span');
    initials.innerText = initial.toUpperCase();
    avatar.append(initials);
    person.append(avatar);
    userList.append(person);
  });

  videoGrid.className = 'videos__reel';

  if (allUsers.length == 1) {
    videoGrid.classList.add('auto', 'one');
  } else if (allUsers.length == 2) {
    videoGrid.classList.add('auto', 'two');
  } else if (allUsers.length == 3) {
    videoGrid.classList.add('auto', 'three');
  } else if (allUsers.length == 4) {
    videoGrid.classList.add('auto', 'four');
  } else if (allUsers.length == 5) {
    videoGrid.classList.add('auto', 'five');
  } else if (allUsers.length == 6) {
    videoGrid.classList.add('auto', 'six');
  } else if (allUsers.length == 7) {
    videoGrid.classList.add('auto', 'seven');
  } else if (allUsers.length == 8) {
    videoGrid.classList.add('auto', 'eight');
  } else if (allUsers.length == 9) {
    videoGrid.classList = [];
  }
}

function appendMessage(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  const username = document.createElement('span');
  if (sender == 'me') {
    messageElement.classList.add('me');
    username.innerText = 'You';
  } else {
    messageElement.classList.remove('me');
    username.innerText = sender;
  }
  messageElement.append(username);
  const messageText = document.createElement('div');
  messageText.className = 'bubble';
  messageText.innerText = message;
  messageElement.append(messageText);
  messageContainer.append(messageElement);

  if (autoscroll) {
    messageElement.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
}

// socket.on('room-created', (room) => {
//   const roomElement = document.createElement('div');
//   roomElement.innerText = room;
//   const roomLink = document.createElement('a');
//   roomLink.href = `/${room}`;
//   roomLink.innerText = 'join';
//   roomContainer.append(roomElement);
//   roomContainer.append(roomLink);
// });

socket.on('chat-message', (data) => {
  appendMessage(data.message, data.name);
});
