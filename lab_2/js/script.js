const playlist = [
  {title: "Calm Down", artist: "Rema, Selena Gomez", file: "music/Calm Down.mp3", cover: "img/pickme1.jpg"},
  {title: "Careless Whisper", artist: "George Michael", file: "music/Careless Whisper.mp3", cover: "img/pickme2.jpg"},
  {title: "Mi Gente", artist: "J Balvin, Willy William", file: "music/Mi Gente.mp3", cover: "img/pickme3.png"},
  {title: "Şımarık", artist: "Tarkan", file: "music/Şımarık.mp3", cover: "img/pickme4.jpg"},
];

//domik
const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const muteBtn = document.getElementById("muteBtn");
const cover = document.getElementById("cover");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const seek = document.getElementById("seek");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const shuffleBtn = document.getElementById("shuffle");
const trackListEl = document.getElementById("trackList");

const bgCanvas = document.getElementById("bg-viz");
const bgCtx = bgCanvas.getContext("2d");

// Audio Analyser
let audioCtx, analyser, source, dataArray, bufferLength;
let rafId;
let currentIndex = 0;
let isSeeking = false;


function populateTrackList() {
  trackListEl.innerHTML = "";
  playlist.forEach((t, i) => {
    const li = document.createElement("li");
    li.dataset.index = i;
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    const title = document.createElement("div");
    title.className = "track-title";
    title.textContent = t.title;
    const artist = document.createElement("div");
    artist.className = "track-artist";
    artist.textContent = t.artist;
    left.appendChild(title);
    left.appendChild(artist);
    li.appendChild(left);
    li.addEventListener("click", () => {
      loadTrack(i);
      playAndUpdate();
    });
    trackListEl.appendChild(li);
  });
  highlightActive();
}

function highlightActive() {
  Array.from(trackListEl.children).forEach(li => {
    li.classList.toggle("active", Number(li.dataset.index) === currentIndex);
  });
}

function loadTrack(index) {
  currentIndex = index;
  const t = playlist[currentIndex];
  audio.src = t.file;
  cover.src = t.cover;
  titleEl.textContent = t.title;
  artistEl.textContent = t.artist;
  highlightActive();
  // сброс seek, таймеры будут обновлены onloadedmetadata/animation loop
  seek.value = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";
}

function playAndUpdate() {
  initAudio();
  audio.play().catch(() => {
  });
  playBtn.textContent = "⏸";
}

populateTrackList();
loadTrack(0);

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  resizeCanvas();
  startViz();
}


function resizeCanvas() {
  const DPR = window.devicePixelRatio || 1;
  bgCanvas.style.width = window.innerWidth + "px";
  bgCanvas.style.height = window.innerHeight + "px";
  bgCanvas.width = Math.round(window.innerWidth * DPR);
  bgCanvas.height = Math.round(window.innerHeight * DPR);
  bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", () => {
  resizeCanvas();
});

// viz
let rotation = 0;

function startViz() {
  cancelAnimationFrame(rafId);

  function draw() {
    rafId = requestAnimationFrame(draw);
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);

    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    // получаем центр обложки в CSS-пикселях (getBoundingClientRect даёт CSS px)
    const rect = cover.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const coverR = Math.max(rect.width, rect.height) / 2;

    // мягкое рассеяние
    const glowOuter = coverR + 120;
    const g = bgCtx.createRadialGradient(cx, cy, coverR - 6, cx, cy, glowOuter);
    g.addColorStop(0, "rgba(180,120,255,0.06)");
    g.addColorStop(0.4, "rgba(220,150,255,0.04)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    bgCtx.fillStyle = g;
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, glowOuter, 0, Math.PI * 2);
    bgCtx.fill();

    // Bars: используем меньшее количество для аккуратности и сглаживаем их (интерполяция)
    const bars = Math.min(64, bufferLength);
    const step = (Math.PI * 2) / bars;
    for (let i = 0; i < bars; i++) {
      const raw = dataArray[i];
      // гамма-коррекция
      const val = Math.pow(raw / 255, 1.3);
      const len = val * 110 + 10;
      const angle = i * step + rotation;

      const inner = coverR + 6;
      const outer = coverR + len;

      const x1 = cx + Math.cos(angle) * inner;
      const y1 = cy + Math.sin(angle) * inner;
      const x2 = cx + Math.cos(angle) * outer;
      const y2 = cy + Math.sin(angle) * outer;

      // основной shtyk
      bgCtx.beginPath();
      bgCtx.moveTo(x1, y1);
      bgCtx.lineTo(x2, y2);
      bgCtx.lineWidth = 4;
      bgCtx.lineCap = "round";
      bgCtx.shadowBlur = 28;
      bgCtx.shadowColor = "rgba(182,96,241,0.9)";
      bgCtx.strokeStyle = "rgba(154,50,244,0.91)";
      bgCtx.stroke();

      // яркий тонкий центр
      bgCtx.beginPath();
      bgCtx.moveTo(cx + Math.cos(angle) * (inner + 2), cy + Math.sin(angle) * (inner + 2));
      bgCtx.lineTo(cx + Math.cos(angle) * (inner + (outer - inner) * 0.75), cy + Math.sin(angle) * (inner + (outer - inner) * 0.75));
      bgCtx.lineWidth = 1.8;
      bgCtx.shadowBlur = 10;
      bgCtx.shadowColor = "rgba(228,200,255,0.95)";
      bgCtx.strokeStyle = "rgba(241,230,255,0.98)";
      bgCtx.stroke();
    }


    const rings = 2;
    for (let r = 0; r < rings; r++) {
      const rBase = coverR + 8 + r * 16 + Math.sin(performance.now() * 0.001 + r) * 3;
      bgCtx.beginPath();
      bgCtx.arc(cx, cy, rBase, 0, Math.PI * 2);
      bgCtx.lineWidth = 1;
      bgCtx.shadowBlur = r === 0 ? 18 : 8;
      bgCtx.shadowColor = "rgba(200,150,255,0.12)";
      bgCtx.strokeStyle = r === 0 ? "rgba(220,170,255,0.08)" : "rgba(220,170,255,0.04)";
      bgCtx.stroke();
    }


    rotation += 0.0030;
  }

  draw();
}
// play
playBtn.onclick = () => {
  initAudio();
  if (audio.paused) {
    audio.play();
    playBtn.textContent = "⏸";
  } else {
    audio.pause();
    playBtn.textContent = "▶";
  }
};

nextBtn.onclick = () => {
  currentIndex = (currentIndex + 1) % playlist.length;
  loadTrack(currentIndex);
  playAndUpdate();
};
prevBtn.onclick = () => {
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentIndex);
  playAndUpdate();
};

muteBtn.onclick = () => {
  audio.muted = !audio.muted;
  muteBtn.textContent = audio.muted ? "🔇" : "🔊";
};

// shuffle
shuffleBtn.onclick = () => {
  for (let i = playlist.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
  }
  populateTrackList();
  loadTrack(0);
  playAndUpdate();
};

function formatTime(t) {
  if (!isFinite(t) || t <= 0) return "0:00";
  const mm = Math.floor(t / 60);
  const ss = Math.floor(t % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}


audio.addEventListener('loadedmetadata', () => {

  const dur = isFinite(audio.duration) ? audio.duration : 0;
  seek.max = dur;
  seek.value = audio.currentTime || 0;
  durationEl.textContent = formatTime(dur);
});

// плавное обновление времени через rAF — чтобы таймеры всегда синхронны и плавные
let timeRaf = null;

function startTimeUpdater() {
  cancelAnimationFrame(timeRaf);

  function tick() {
    if (!isSeeking) {
      currentTimeEl.textContent = formatTime(audio.currentTime || 0);
      seek.value = audio.currentTime || 0;
    }
    // авто-переход при окончании
    if (!audio.paused && audio.ended) {
      // наступает ended; можно перейти на следующий автоматом
      currentIndex = (currentIndex + 1) % playlist.length;
      loadTrack(currentIndex);
      playAndUpdate();
      return; // далее rAF будет заново запущен после play
    }
    timeRaf = requestAnimationFrame(tick);
  }

  tick();
}

audio.addEventListener('play', startTimeUpdater);
audio.addEventListener('pause', () => {
  cancelAnimationFrame(timeRaf);
});


seek.addEventListener('input', () => {
  isSeeking = true;
  currentTimeEl.textContent = formatTime(seek.value);
});
seek.addEventListener('change', () => {
  audio.currentTime = seek.value;
  isSeeking = false;
});


audio.addEventListener('ended', () => {
  currentIndex = (currentIndex + 1) % playlist.length;
  loadTrack(currentIndex);
  playAndUpdate();
});


document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(rafId);
  } else {
    if (analyser) startViz();
  }
});


populateTrackList();

// загружаем  пользовательские ЧЕГО ХОЗЯИН ПО ЖЕЛАЕТ ПОШЕЛ БЫ ОН
const uploadAudio = document.getElementById("uploadAudio");

uploadAudio.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  const newTrack = {
    title: file.name.replace(/\.[^/.]+$/, ""),
    artist: "Пользовательский трек",
    file: url,
    cover: "img/pickme1.jpg",
    comment: "Загрузил пользователь"
  };

  playlist.push(newTrack);
  populateTrackList(); // обновляем список
  loadTrack(playlist.length - 1); // загружаем новый
  playAndUpdate(); // запускаем воспроизведение

  e.target.value = ""; // сбрасываем input, чтобы можно было загрузить тот же файл повторно
});

