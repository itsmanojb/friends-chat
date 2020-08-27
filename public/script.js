const videoGrid = document.getElementById('videoGrid');
const myVideo = document.createElement('video');
myVideo.muted = true;

let videoStream;

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then((stream) => {
  videoStream = stream;
  addVideoStream(myVideo, stream);
})

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play()
  });
  videoGrid.append(video);
}