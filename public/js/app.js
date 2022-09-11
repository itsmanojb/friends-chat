const clockElement = document.querySelector('#clock');

function showTime(withDate = true) {
  const today = new Date();
  const month = today.toLocaleString('en-us', { month: 'short' });
  const day = today.toLocaleString('en-us', { weekday: 'short' });
  const date = `${day}, ${month} ${today.getDate()}`;

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
  const time = h + ":" + m + " " + session;
  const dateTime = withDate ? `${time} • ${date}` : time;
  clockElement.innerHTML = dateTime;

  setTimeout(() => showTime(withDate), 1000);
}
