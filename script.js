['under-construction-img', 'visitor-badge'].forEach(id => {
  const img = document.getElementById(id);
  if (img) img.addEventListener('error', () => { img.style.display = 'none'; });
});

const clockEl = document.getElementById('clock');

function updateClock() {
  if (!clockEl) return;
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  clockEl.textContent = `${hours}:${minutes} ${ampm}`;
}

function scheduleClock() {
  updateClock();
  setTimeout(scheduleClock, 60000 - (Date.now() % 60000));
}
scheduleClock();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateClock();
});

// Winamp player
const audio     = document.getElementById('winamp-audio');
const playBtn   = document.getElementById('winamp-play');
const stopBtn   = document.getElementById('winamp-stop');
const volSlider = document.getElementById('winamp-volume');
const marquee   = document.querySelector('.winamp-marquee');

if (audio && playBtn && stopBtn && volSlider) {
  audio.volume = Number(volSlider.value);

  const syncPlayState = () => {
    const playing = !audio.paused;
    playBtn.textContent = playing ? '⏸' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    if (marquee) marquee.classList.toggle('playing', playing);
  };

  audio.addEventListener('play', syncPlayState);
  audio.addEventListener('pause', syncPlayState);
  audio.addEventListener('ended', syncPlayState);
  audio.addEventListener('error', syncPlayState);

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      const played = audio.play();
      // Older browsers return undefined instead of a promise
      if (played) played.catch(syncPlayState);
    } else {
      audio.pause();
    }
  });

  stopBtn.addEventListener('click', () => {
    audio.pause();
    audio.currentTime = 0;
  });

  volSlider.addEventListener('input', () => {
    audio.volume = Number(volSlider.value);
  });
}


document.querySelectorAll('button.close-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    alert('ERROR: Cannot close this window.\n\nSloppin Out is eternal.');
  });
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function applyMotionPreference() {
  document.querySelectorAll('marquee').forEach(el => {
    el.setAttribute('scrollamount', reduceMotion.matches ? '0' : '4');
  });
}
applyMotionPreference();
reduceMotion.addEventListener('change', applyMotionPreference);
