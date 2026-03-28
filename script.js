// Hide broken under-construction gif gracefully
const ucImg = document.getElementById('under-construction-img');
if (ucImg) ucImg.addEventListener('error', () => { ucImg.style.display = 'none'; });

// Clock
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  document.getElementById('clock').textContent = `${hours}:${minutes} ${ampm}`;
}
updateClock();
setInterval(updateClock, 60000);

// Make link card clicks work (since the whole card is an <a>)
document.querySelectorAll('.link-card .retro-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(btn.closest('a').href, '_blank');
  });
});

// Fake close button alert (classic 90s)
document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    alert('ERROR: Cannot close this window.\n\nSloppin Out is eternal.');
  });
});
