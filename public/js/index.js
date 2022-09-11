
showTime();

const setAction = () => {
  const roomId = document.getElementById('inputRoomId').value;
  const btn = document.getElementById('btnSubmit');
  if (roomId.trim()) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

