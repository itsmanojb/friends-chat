showTime();

const username = sessionStorage.getItem('U');
if (username) {
  document.getElementById('username').value = username
}
const mediaAlert = document.getElementById('mediaAlert');
const mediaAlertDismiss = document.getElementById('dismissBtn');

const videoBtn = document.getElementById('btnVideo');
const audioBtn = document.getElementById('btnAudio');

const myVideo = document.createElement('video');
let myVideoStream;

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {

    const { video, audio } = getUserMediaSettings();
    myVideoStream = stream;

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

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  video.classList.add('h-full', 'w-full', 'object-cover');
  const preview = document.getElementById('video-preview');
  preview.append(video)
}

function getUserMediaSettings() {
  const audio = sessionStorage.getItem('user-audio');
  const video = sessionStorage.getItem('user-video');
  const noAudio = (audio && audio == 'off') ? true : false;
  const noVideo = (video && video == 'off') ? true : false;
  return { video: !noVideo, audio: !noAudio }
}

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  const btn = document.getElementById('btnAudio');
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    sessionStorage.setItem('user-audio', 'off');
    btn.classList.remove('media-btn__on')
    btn.classList.add('media-btn__off');
  } else {
    myVideoStream.getAudioTracks()[0].enabled = true;
    sessionStorage.setItem('user-audio', 'on');
    btn.classList.remove('media-btn__off');
    btn.classList.add('media-btn__on');
  }
};

const cameraOnOff = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  const btn = document.getElementById('btnVideo');
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    sessionStorage.setItem('user-video', 'off');
    btn.classList.remove('media-btn__on');
    btn.classList.add('media-btn__off');
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    sessionStorage.setItem('user-video', 'on');
    btn.classList.remove('media-btn__off');
    btn.classList.add('media-btn__on');
  }
};

const submitForm = () => {
  const name = document.getElementById('username').value;
  sessionStorage.setItem('U', name);
  return true;
}
