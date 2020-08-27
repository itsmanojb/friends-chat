const socket = io('/');
const videoGrid = document.getElementById('videoGrid');
const chatBox = document.getElementById('chatBox');
const myVideo = document.createElement('video');
// myVideo.muted = true;

var peer = new Peer(undefined, {
  path: '/peerjs',
  host: '/',
  port: '3030',
});

let videoStream;

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
};

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    videoStream = stream;
    addVideoStream(myVideo, stream);

    peer.on('call', (call) => {
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('user-connected', (userId) => {
      connectToNewUser(userId, stream);
    });
  });

peer.on('open', (peerId) => {
  socket.emit('join-room', roomId, peerId);
});

const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
};

const input = document.getElementById('messageBox');
input.addEventListener('keydown', ({ key }) => {
  if (key === 'Enter') {
    event.preventDefault();
    const value = input.value.trim();
    if (value) {
      socket.emit('message', value);
      input.value = '';
    }
  }
});

socket.on('create-message', (message) => {
  const newMessage = `<div>${message}</div>`;
  chatBox.innerHTML = chatBox.innerHTML + newMessage;
  scrollToBottom();
});

const scrollToBottom = () => {
  const element = document.getElementById('chatBox');
  element.scrollTop = element.scrollHeight - element.clientHeight;
};

const toggleMute = () => {
  const enabled = videoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    videoStream.getAudioTracks()[0].enabled = false;
    document.getElementById('muteBtn').innerText = 'Unmute';
  } else {
    videoStream.getAudioTracks()[0].enabled = true;
    document.getElementById('muteBtn').innerText = 'Mute';
  }
};

const toggleVideo = () => {
  const enabled = videoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    videoStream.getVideoTracks()[0].enabled = false;
    document.getElementById('videoBtn').innerText = 'Play Video';
  } else {
    videoStream.getVideoTracks()[0].enabled = true;
    document.getElementById('videoBtn').innerText = 'Stop Video';
  }
};
