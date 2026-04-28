'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const RING_CIRC = 2 * Math.PI * 28; // 175.93

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SEEN_KEY = 'neuroquest_seen_v1';

function readSeen() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function writeSeen(arr) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(SEEN_KEY, JSON.stringify(arr)); } catch {}
}

// Pick `count` questions from `pool` that have not been seen.
// If unseen pool is too small, reset and start a fresh cycle.
function pickFreshQuestions(pool, count) {
  const seen = new Set(readSeen());
  let unseen = pool.filter((q) => !seen.has(q.q));
  if (unseen.length < count) {
    // Cycle: clear seen, optionally bias against the very last batch
    writeSeen([]);
    unseen = pool.slice();
  }
  const picked = shuffle(unseen).slice(0, Math.min(count, unseen.length));
  // Mark these as seen
  const newSeen = Array.from(new Set([...readSeen(), ...picked.map((q) => q.q)]));
  writeSeen(newSeen);
  return picked;
}

function buildSet(pool, count) {
  const picked = pickFreshQuestions(pool, count);
  return picked.map((item) => {
    const indexed = item.o.map((text, i) => ({ text, wasCorrect: i === item.a }));
    const shuffled = shuffle(indexed);
    return {
      q: item.q,
      o: shuffled.map((x) => x.text),
      a: shuffled.findIndex((x) => x.wasCorrect),
    };
  });
}

/* ===== Open Trivia Database (OpenTDB) integration =====
   Free, no API key. Uses session tokens to avoid repeating questions
   in the same browser until the category is exhausted.
   See https://opentdb.com/api_config.php
*/
const OTDB_TOKEN_KEY = 'neuroquest_otdb_token_v1';

function decodeHtml(s) {
  if (typeof document === 'undefined') return s;
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  return ta.value;
}

async function getOtdbToken() {
  if (typeof window === 'undefined') return null;
  let token = window.localStorage.getItem(OTDB_TOKEN_KEY);
  if (token) return token;
  try {
    const r = await fetch('https://opentdb.com/api_token.php?command=request');
    const d = await r.json();
    if (d?.response_code === 0 && d.token) {
      window.localStorage.setItem(OTDB_TOKEN_KEY, d.token);
      return d.token;
    }
  } catch {}
  return null;
}

async function resetOtdbToken(token) {
  try {
    await fetch(`https://opentdb.com/api_token.php?command=reset&token=${token}`);
  } catch {}
}

async function fetchOtdbQuestions(count, category = 9) {
  const token = await getOtdbToken();
  const tokenParam = token ? `&token=${token}` : '';
  const url = `https://opentdb.com/api.php?amount=${count}&category=${category}&type=multiple${tokenParam}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('OpenTDB HTTP ' + r.status);
  const d = await r.json();

  // response_code: 0=ok, 1=no results, 2=invalid param, 3=token not found, 4=token exhausted
  if (d.response_code === 4 && token) {
    await resetOtdbToken(token);
    return fetchOtdbQuestions(count, category);
  }
  if (d.response_code === 3) {
    // bad token, drop and retry once
    if (typeof window !== 'undefined') window.localStorage.removeItem(OTDB_TOKEN_KEY);
    return fetchOtdbQuestions(count, category);
  }
  if (d.response_code !== 0 || !Array.isArray(d.results) || !d.results.length) {
    throw new Error('OpenTDB response_code ' + d.response_code);
  }

  return d.results.map((item) => {
    const correct = decodeHtml(item.correct_answer);
    const incorrect = item.incorrect_answers.map(decodeHtml);
    const all = shuffle([correct, ...incorrect]);
    return {
      q: decodeHtml(item.question),
      o: all,
      a: all.indexOf(correct),
    };
  });
}

function showBrowserNotification(title, msg) {
  if (typeof Notification === 'undefined') return;
  const fire = () => {
    try { new Notification(title, { body: msg }); } catch {}
  };
  if (Notification.permission === 'granted') fire();
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((p) => p === 'granted' && fire());
  }
}

/* ---------- Background pieces (Batman / Gotham theme) ---------- */
// Bat-shaped glyphs for the vertical streams (rain over Gotham)
const GLYPHS = '⩕⩔⌒︵︶◣◢◤◥▴▾';

// Iconic Bat symbol — stylised silhouette
function BatSymbol({ className, fill = '#000', stroke = 'none' }) {
  return (
    <svg className={className} viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet">
      <path
        d="M100,18 C108,28 118,30 128,24 C136,20 142,30 142,44 C150,38 162,38 172,42 C184,46 192,52 198,60 C188,58 178,60 170,64 C162,68 156,72 150,80 C140,72 130,72 120,76 C112,79 106,80 100,80 C94,80 88,79 80,76 C70,72 60,72 50,80 C44,72 38,68 30,64 C22,60 12,58 2,60 C8,52 16,46 28,42 C38,38 50,38 58,44 C58,30 64,20 72,24 C82,30 92,28 100,18 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
      />
    </svg>
  );
}

// Gotham skyline — procedural rectangular silhouette
function GothamSkyline() {
  // Generate jagged building tops deterministically (no Math.random in render)
  const buildings = [
    [0, 60], [40, 90], [80, 50], [110, 70], [150, 30], [180, 80], [220, 55],
    [260, 95], [300, 40], [340, 75], [380, 25], [420, 60], [470, 85], [510, 45],
    [560, 70], [600, 35], [650, 90], [700, 55], [750, 75], [810, 40], [860, 80],
    [910, 50], [960, 70], [1010, 30], [1060, 85], [1110, 45], [1160, 65], [1210, 95],
    [1270, 40], [1320, 75], [1380, 55], [1450, 60],
  ];
  const path = ['M0,160'];
  buildings.forEach(([x, h]) => {
    path.push(`L${x},${160 - h}`);
    path.push(`L${x + 35},${160 - h}`);
  });
  path.push('L1500,160 Z');
  return (
    <div className="skyline" aria-hidden>
      <svg viewBox="0 0 1500 160" preserveAspectRatio="xMidYEnd slice">
        {/* far skyline (lighter) */}
        <path d={path.join(' ')} fill="#000" />
        {/* a few lit windows */}
        {buildings.filter((_, i) => i % 3 === 0).map(([x, h], i) => (
          <rect key={i} x={x + 10} y={160 - h + 10} width="3" height="3" fill="#ffd60a" opacity="0.6" />
        ))}
        {buildings.filter((_, i) => i % 4 === 1).map(([x, h], i) => (
          <rect key={`b-${i}`} x={x + 22} y={160 - h + 22} width="3" height="3" fill="#ffae00" opacity="0.5" />
        ))}
        {/* antenna spires on a couple of buildings */}
        <line x1="262" y1={160 - 95} x2="262" y2={160 - 130} stroke="#000" strokeWidth="2" />
        <line x1="652" y1={160 - 90} x2="652" y2={160 - 125} stroke="#000" strokeWidth="2" />
        <line x1="1062" y1={160 - 85} x2="1062" y2={160 - 118} stroke="#000" strokeWidth="2" />
      </svg>
    </div>
  );
}

function BatmanBackground() {
  // Defer random generation to after client mount to avoid SSR hydration mismatch.
  const [decor, setDecor] = useState({ nodes: [], streams: [] });
  useEffect(() => {
    const nodes = Array.from({ length: 36 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 70, // keep stars in upper portion of sky
      delay: Math.random() * 3,
      size: 1 + Math.random() * 3,
      opacity: (0.3 + Math.random() * 0.6).toFixed(2),
    }));
    const streams = Array.from({ length: 5 }, () => {
      let txt = '';
      for (let k = 0; k < 50; k++) txt += GLYPHS[Math.floor(Math.random() * GLYPHS.length)] + ' ';
      return {
        left: Math.random() * 100,
        delay: Math.random() * -14,
        duration: 12 + Math.random() * 10,
        text: txt,
      };
    });
    setDecor({ nodes, streams });
  }, []);

  return (
    <>
      <div className="vignette" />
      <div className="grid-bg" />
      <div className="bat-signal" />
      <BatSymbol className="bat-signal-icon" fill="#ffd60a" />
      <div className="scan" />
      <BatSymbol className="gear tr" fill="#ffd60a" />
      <BatSymbol className="gear bl" fill="#ffd60a" />
      <div className="nodes">
        {decor.nodes.map((n, i) => (
          <div
            key={i}
            className="node"
            style={{
              left: `${n.left}%`,
              top: `${n.top}%`,
              width: `${n.size}px`,
              height: `${n.size}px`,
              animationDelay: `${n.delay}s`,
              opacity: n.opacity,
            }}
          />
        ))}
      </div>
      {decor.streams.map((s, i) => (
        <div
          key={i}
          className="data"
          style={{
            left: `${s.left}%`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        >
          {s.text}
        </div>
      ))}
      <GothamSkyline />
      <svg className="circuit tl" width="180" height="180" viewBox="0 0 180 180" fill="none">
        <path d="M0 26 H56 L74 44 H120 L138 62 H180" stroke="#ffd60a" strokeWidth="1.4" />
        <path d="M0 64 H40 L58 82 H100" stroke="#ffae00" strokeWidth="1.1" />
        <circle cx="56" cy="26" r="2.5" fill="#ffd60a" />
        <circle cx="120" cy="44" r="2.5" fill="#ffae00" />
      </svg>
      <svg className="circuit br" width="180" height="180" viewBox="0 0 180 180" fill="none">
        <path d="M0 26 H56 L74 44 H120 L138 62 H180" stroke="#ffd60a" strokeWidth="1.4" />
        <path d="M0 64 H40 L58 82 H100" stroke="#ffae00" strokeWidth="1.1" />
        <circle cx="56" cy="26" r="2.5" fill="#ffd60a" />
        <circle cx="120" cy="44" r="2.5" fill="#ffae00" />
      </svg>
    </>
  );
}

/* ---------- Confetti ---------- */
function ConfettiCanvas({ trigger }) {
  const canvasRef = useRef(null);
  const piecesRef = useRef([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const size = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight; };
    size();
    window.addEventListener('resize', size);

    const draw = () => {
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      piecesRef.current = piecesRef.current.filter((p) => p.life > 0 && p.y < cvs.height + 20);
      piecesRef.current.forEach((p) => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', size);
    };
  }, []);

  useEffect(() => {
    if (!trigger) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const colors = ['#00e5ff', '#00ffa3', '#7df9ff', '#ffb347', '#ffffff'];
    const spawn = (n, opts = {}) => {
      for (let i = 0; i < n; i++) {
        piecesRef.current.push({
          x: opts.x ?? Math.random() * cvs.width,
          y: opts.y ?? -10,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 4 + 2,
          g: 0.12 + Math.random() * 0.08,
          size: 4 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.2,
          life: 200 + Math.random() * 120,
        });
      }
    };
    if (trigger.type === 'mini') spawn(80, { x: window.innerWidth - 60, y: 60 });
    if (trigger.type === 'big') {
      let bursts = 0;
      const t = setInterval(() => {
        spawn(60); bursts += 1;
        if (bursts > 6) clearInterval(t);
      }, 220);
      return () => clearInterval(t);
    }
  }, [trigger]);

  return <canvas ref={canvasRef} className="confetti-canvas" />;
}

/* ---------- Live Weather + City + Time widget ----------
   Uses three free APIs, no keys required:
   - Browser Geolocation (navigator.geolocation) → lat/lon
   - BigDataCloud reverse-geocode (https://api.bigdatacloud.net) → city name
   - Open-Meteo (https://api.open-meteo.com) → current weather
   Falls back to IP-based geolocation (https://ipapi.co/json) if the user denies geolocation.
   Time is the local browser clock, ticking every second.
*/

const WMO = {
  0: { label: 'Clear', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫' }, 48: { label: 'Rime fog', icon: '🌫' },
  51: { label: 'Light drizzle', icon: '🌦' }, 53: { label: 'Drizzle', icon: '🌦' }, 55: { label: 'Heavy drizzle', icon: '🌧' },
  61: { label: 'Light rain', icon: '🌧' }, 63: { label: 'Rain', icon: '🌧' }, 65: { label: 'Heavy rain', icon: '🌧' },
  71: { label: 'Light snow', icon: '🌨' }, 73: { label: 'Snow', icon: '🌨' }, 75: { label: 'Heavy snow', icon: '❄️' },
  80: { label: 'Showers', icon: '🌦' }, 81: { label: 'Heavy showers', icon: '🌧' }, 82: { label: 'Violent showers', icon: '⛈' },
  95: { label: 'Thunderstorm', icon: '⛈' }, 96: { label: 'Storm + hail', icon: '⛈' }, 99: { label: 'Severe storm', icon: '⛈' },
};

function WeatherWidget() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [now, setNow] = useState(null); // null on server / pre-mount to avoid hydration mismatch

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    const fetchWeather = async (lat, lon) => {
      try {
        const [w, g] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`).then((r) => r.json()),
          fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`).then((r) => r.json()).catch(() => null),
        ]);
        if (!alive) return;
        if (!w?.current_weather) throw new Error('No current_weather');
        const cw = w.current_weather;
        const wmo = WMO[cw.weathercode] || { label: 'Unknown', icon: '🌡' };
        setData({
          city: g?.city || g?.locality || g?.principalSubdivision || 'Unknown',
          country: g?.countryName || g?.countryCode || '',
          tempC: Math.round(cw.temperature),
          windKph: cw.windspeed,
          conditionLabel: wmo.label,
          conditionIcon: wmo.icon,
        });
      } catch (e) {
        if (alive) setErr(String(e?.message || e));
      }
    };

    const fallbackByIp = async () => {
      try {
        const r = await fetch('https://ipapi.co/json/');
        if (!r.ok) throw new Error('IP geo HTTP ' + r.status);
        const d = await r.json();
        if (d?.latitude && d?.longitude) await fetchWeather(d.latitude, d.longitude);
        else setErr('Could not determine location.');
      } catch (e) { if (alive) setErr(String(e?.message || e)); }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fallbackByIp(),
        { timeout: 6000, maximumAge: 600000 },
      );
    } else {
      fallbackByIp();
    }
    return () => { alive = false; };
  }, []);

  return (
    <div className="weather-widget" aria-label="Live weather and time">
      <div className="ww-time">
        {now ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
      </div>
      <div className="ww-date">
        {now ? now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
      </div>
      {data ? (
        <div className="ww-row">
          <span className="ww-icon" aria-hidden>{data.conditionIcon}</span>
          <div className="ww-stack">
            <div className="ww-temp">{data.tempC}°C · {data.conditionLabel}</div>
            <div className="ww-city">📍 {data.city}{data.country ? `, ${data.country}` : ''}</div>
          </div>
        </div>
      ) : err ? (
        <div className="ww-row"><span className="ww-icon">🌐</span><div className="ww-stack"><div className="ww-temp">Weather unavailable</div><div className="ww-city">Allow location to enable</div></div></div>
      ) : (
        <div className="ww-row"><span className="ww-icon">🌡</span><div className="ww-stack"><div className="ww-temp">Loading weather…</div><div className="ww-city">Getting your location</div></div></div>
      )}
    </div>
  );
}

/* ---------- Main Component ---------- */
export default function AptitudeTest() {
  const [questions, setQuestions] = useState([]);
  const [passMark, setPassMark] = useState(7);
  const [secondsPerQ, setSecondsPerQ] = useState(30);
  const [questionsPerTest, setQuestionsPerTest] = useState(10);
  const [apiSource, setApiSource] = useState('opentdb'); // 'opentdb' | 'local'
  const [apiCategory, setApiCategory] = useState(9);     // OpenTDB category id (9 = General Knowledge)
  const [loadingTest, setLoadingTest] = useState(false);
  const [apiNotice, setApiNotice] = useState(null);      // shown briefly if API failed and we fell back
  const [loadError, setLoadError] = useState(null);

  // 'intro' | 'quiz' | 'result' | 'hr-loading' | 'hr' | 'hr-result'
  const [screen, setScreen] = useState('intro');
  // HR round state
  const [hrSet, setHrSet] = useState([]);
  const [hrIdx, setHrIdx] = useState(0);
  const [hrScore, setHrScore] = useState(0);
  const [hrPicked, setHrPicked] = useState(null);
  const [hrLocked, setHrLocked] = useState(false);
  const [hrCount] = useState(5); // number of HR questions per round
  // Company Match (final round) state
  const [company, setCompany] = useState(null);
  const [activeSet, setActiveSet] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null); // index of picked option
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [hint, setHint] = useState("Tip: read carefully — the obvious answer isn't always right.");
  const [toast, setToast] = useState(null);
  const [confetti, setConfetti] = useState(null);
  const passNotifiedRef = useRef(false);
  const timerRef = useRef(null);

  // ----- Background music (cinematic Cybertronian synth + optional MP3 override) -----
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  const audioElRef = useRef(null);
  const audioCtxRef = useRef(null);
  const synthNodesRef = useRef(null);
  const arpIntervalRef = useRef(null);

  const startMp3Music = () => {
    const a = audioElRef.current;
    if (!a) return false;
    a.volume = 0.5;
    a.loop = true;
    return a.play().then(() => true).catch(() => false);
  };

  const startSynthMusic = () => {
    if (typeof window === 'undefined') return;
    if (audioCtxRef.current) return; // already running
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);
    // Fade in
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 2);

    // Sub drone — D2
    const drone = ctx.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.value = 73.42;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 220;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.18;
    drone.connect(droneFilter).connect(droneGain).connect(master);
    drone.start();

    // Pad — D minor triad sustained sines with slow LFO shimmer
    const padFreqs = [146.83, 174.61, 220]; // D3, F3, A3
    const padOscs = padFreqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1 + i * 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain).connect(g.gain);
      lfo.start();
      osc.connect(g).connect(master);
      osc.start();
      return { osc, lfo };
    });

    // Arpeggio sequencer — D minor melody, 90 BPM-ish
    const arpFreqs = [293.66, 349.23, 440, 293.66, 587.33, 440, 349.23, 293.66]; // D4 F4 A4 D4 D5 A4 F4 D4
    let step = 0;
    const arpInterval = setInterval(() => {
      if (!audioCtxRef.current) return;
      const c = audioCtxRef.current;
      const f = arpFreqs[step % arpFreqs.length];
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.10, c.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
      o.connect(g).connect(master);
      o.start();
      o.stop(c.currentTime + 0.5);
      step += 1;
    }, 420);
    arpIntervalRef.current = arpInterval;

    synthNodesRef.current = { master, drone, padOscs };
  };

  const stopMusic = () => {
    const a = audioElRef.current;
    if (a) { try { a.pause(); a.currentTime = 0; } catch {} }
    if (arpIntervalRef.current) { clearInterval(arpIntervalRef.current); arpIntervalRef.current = null; }
    const ctx = audioCtxRef.current;
    if (ctx) {
      try { ctx.close(); } catch {}
      audioCtxRef.current = null;
      synthNodesRef.current = null;
    }
  };

  const toggleMute = () => {
    setMusicMuted((m) => {
      const next = !m;
      const a = audioElRef.current;
      if (a) a.muted = next;
      const nodes = synthNodesRef.current;
      if (nodes && audioCtxRef.current) {
        nodes.master.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
        nodes.master.gain.linearRampToValueAtTime(next ? 0 : 0.28, audioCtxRef.current.currentTime + 0.3);
      }
      return next;
    });
  };

  // Try MP3 first; fall back to synth if not present
  const ensureMusicStarted = async () => {
    if (musicStarted) return;
    setMusicStarted(true);
    const ok = await startMp3Music();
    if (!ok) startSynthMusic();
  };

  useEffect(() => () => stopMusic(), []);

  // Load questions.json
  useEffect(() => {
    let alive = true;
    fetch('/questions.json', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((data) => {
        if (!alive) return;
        setQuestions(data.questions || []);
        if (data.config) {
          if (typeof data.config.passMark === 'number') setPassMark(data.config.passMark);
          if (typeof data.config.secondsPerQuestion === 'number') setSecondsPerQ(data.config.secondsPerQuestion);
          if (typeof data.config.questionsPerTest === 'number') setQuestionsPerTest(data.config.questionsPerTest);
          if (typeof data.config.apiSource === 'string') setApiSource(data.config.apiSource);
          if (typeof data.config.apiCategory === 'number') setApiCategory(data.config.apiCategory);
        }
      })
      .catch((e) => { if (alive) setLoadError(String(e)); });
    return () => { alive = false; };
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const runTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(secondsPerQ);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          // Time up — lock with no pick
          setLocked(true);
          setHint('⏰ Time up! The correct answer is highlighted.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [secondsPerQ, stopTimer]);

  // Start a fresh test
  // 1. Try the OpenTDB API first (if config says so) — gives random fresh questions
  // 2. Fall back to local pool with localStorage seen-tracking if the API fails
  const startTest = useCallback(async () => {
    if (loadingTest) return;
    setLoadingTest(true);
    setApiNotice(null);

    // Begin Test counts as a user gesture — safe to start audio here
    ensureMusicStarted();

    let set = null;
    if (apiSource === 'opentdb') {
      try {
        const apiQs = await fetchOtdbQuestions(questionsPerTest, apiCategory);
        // OpenTDB already shuffles options inside our helper. Just pass through.
        set = apiQs;
      } catch (err) {
        console.warn('OpenTDB fetch failed, falling back to local pool:', err);
        setApiNotice("Couldn't reach the trivia API — using offline pool.");
      }
    }
    if (!set) {
      if (!questions.length) { setLoadingTest(false); return; }
      set = buildSet(questions, questionsPerTest);
    }

    setActiveSet(set);
    setIdx(0); setScore(0); setPicked(null); setLocked(false);
    setHint("Tip: read carefully — the obvious answer isn't always right.");
    passNotifiedRef.current = false;
    setLoadingTest(false);
    setScreen('quiz');
    if (apiNotice) setTimeout(() => setApiNotice(null), 4000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingTest, apiSource, apiCategory, questions, questionsPerTest]);

  const restart = useCallback(() => {
    stopTimer();
    setScreen('intro');
    setActiveSet([]); setIdx(0); setScore(0); setPicked(null); setLocked(false);
    setHrSet([]); setHrIdx(0); setHrScore(0); setHrPicked(null); setHrLocked(false);
    passNotifiedRef.current = false;
  }, [stopTimer]);

  // ---- HR Round ----
  const enterHrRound = useCallback(async () => {
    setScreen('hr-loading');
    try {
      const r = await fetch(`/api/hr?count=${hrCount}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      if (!Array.isArray(data?.questions) || !data.questions.length) {
        throw new Error('No HR questions returned');
      }
      setHrSet(data.questions);
      setHrIdx(0); setHrScore(0); setHrPicked(null); setHrLocked(false);
      setHint('🤝 HR Round — choose the answer that shows the strongest soft skills.');
      setScreen('hr');
    } catch (err) {
      console.warn('HR fetch failed:', err);
      setApiNotice("Couldn't load HR Round — please try again.");
      setScreen('result');
    }
  }, [hrCount]);

  const chooseHr = (i) => {
    if (hrLocked) return;
    stopTimer();
    setHrLocked(true);
    setHrPicked(i);
    const cur = hrSet[hrIdx];
    if (i === cur.a) {
      setHrScore((s) => s + 1);
      setHint('✅ Strong answer.');
    } else {
      setHint('💡 The highlighted answer is the textbook professional response.');
    }
  };

  const nextHr = () => {
    if (hrIdx < hrSet.length - 1) setHrIdx(hrIdx + 1);
    else {
      stopTimer();
      // Big celebration if HR also passes (>=60%)
      if ((hrScore + (hrLocked && hrPicked === hrSet[hrIdx]?.a ? 1 : 0)) >= Math.ceil(hrSet.length * 0.6)) {
        setConfetti({ type: 'big', id: Date.now() });
      }
      setScreen('hr-result');
    }
  };

  // ---- Final Round: Company Match (GitHub Organizations API) ----
  // Curated list of high-profile orgs that are known to hire and have public GitHub presences.
  const COMPANY_POOL = [
    'microsoft', 'google', 'meta', 'netflix', 'apple', 'amazon', 'spotify',
    'airbnb', 'uber', 'shopify', 'stripe', 'vercel', 'github', 'openai',
    'anthropics', 'figma', 'notion', 'linear', 'cloudflare', 'discord',
    'databricks', 'mongodb', 'redhat', 'twilio', 'atlassian',
  ];

  const enterCompanyMatch = useCallback(async () => {
    setScreen('company-loading');
    setCompany(null);
    const tries = shuffle(COMPANY_POOL).slice(0, 5);
    for (const org of tries) {
      try {
        const r = await fetch(`https://api.github.com/orgs/${org}`);
        if (r.ok) {
          const data = await r.json();
          setCompany(data);
          setScreen('company');
          return;
        }
      } catch {}
    }
    // All API attempts failed — synthesise a fallback "company" from offline data
    setCompany({
      login: 'WayneEnterprises',
      name: 'Wayne Enterprises',
      description: 'A global conglomerate headquartered in Gotham. Industry leader in technology, science, and security.',
      blog: 'https://wayneenterprises.example',
      html_url: 'https://wayneenterprises.example',
      location: 'Gotham City, USA',
      created_at: '1939-05-01T00:00:00Z',
      avatar_url: '',
    });
    setScreen('company');
    setApiNotice("GitHub API rate-limited — showing offline match.");
  }, []);

  // Whenever a new question loads, start the timer
  useEffect(() => {
    if (screen !== 'quiz') return;
    setPicked(null);
    setLocked(false);
    setHint("Tip: read carefully — the obvious answer isn't always right.");
    runTimer();
    return stopTimer;
  }, [screen, idx, runTimer, stopTimer]);

  // Cleanup timer on unmount
  useEffect(() => stopTimer, [stopTimer]);

  const choose = (i) => {
    if (locked) return;
    stopTimer();
    setLocked(true);
    setPicked(i);
    const cur = activeSet[idx];
    if (i === cur.a) {
      const newScore = score + 1;
      setScore(newScore);
      setHint('✅ Correct! Well done.');
      if (newScore === passMark && !passNotifiedRef.current) {
        passNotifiedRef.current = true;
        const title = '🎉 Congratulations! Exam Cleared!';
        const msg = `You hit the passing score of ${passMark}/${activeSet.length}. Keep going for a perfect run!`;
        setToast({ title, msg });
        showBrowserNotification(title, msg);
        setConfetti({ type: 'mini', id: Date.now() });
        setTimeout(() => setToast(null), 5000);
      }
    } else {
      setHint('❌ Not quite. The correct answer is highlighted.');
    }
  };

  const next = () => {
    if (idx < activeSet.length - 1) setIdx(idx + 1);
    else finish();
  };

  const finish = () => {
    stopTimer();
    const passed = score >= passMark;
    if (passed) {
      const title = '🎉 Congrats! Exam Cleared!';
      const msg = `Final score: ${score}/${activeSet.length}. Excellent performance!`;
      setToast({ title, msg });
      showBrowserNotification(title, msg);
      setConfetti({ type: 'big', id: Date.now() });
      setTimeout(() => setToast(null), 5000);
    }
    setScreen('result');
  };

  // Timer ring class
  const ringClass = locked
    ? 'timer-ring stopped'
    : timeLeft <= 5
    ? 'timer-ring danger'
    : timeLeft <= 10
    ? 'timer-ring warn'
    : 'timer-ring';
  const ringOffset = RING_CIRC * (1 - timeLeft / secondsPerQ);

  const cur = activeSet[idx];
  const passed = score >= passMark;
  const total = activeSet.length || questions.length;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const barPct = activeSet.length ? (idx / activeSet.length) * 100 : 0;
  const letters = ['A', 'B', 'C', 'D'];

  return (
    <>
      <BatmanBackground />

      <div className="stage">
        <div className="card">
          {screen === 'intro' && (
            <div className="intro">
              <WeatherWidget />
              <div>
                <h1>NeuroQuest</h1>
                <div className="subtitle" style={{ marginBottom: 14 }}>General Knowledge · Gotham Edition</div>
                <p>Welcome to Gotham. Answer {questionsPerTest} general-knowledge questions. Score <b style={{ color: 'var(--gold)' }}>{passMark} or more</b> to light the Bat-Signal and clear the exam.</p>
                <div className="meta">
                  <span className="pill">⏱ {secondsPerQ}s per question</span>
                  <span className="pill">⚡ {questionsPerTest} questions</span>
                  <span className="pill">🏆 Pass mark: {passMark}/{questionsPerTest}</span>
                </div>
                <button
                  className="btn"
                  onClick={startTest}
                  disabled={!questions.length || loadingTest}
                >
                  {loadError
                    ? '⚠ Failed to load questions'
                    : !questions.length
                    ? 'Loading questions…'
                    : loadingTest
                    ? 'Fetching trivia…'
                    : 'Begin Test →'}
                </button>
                {apiNotice && (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                    ⚠ {apiNotice}
                  </div>
                )}
              </div>
            </div>
          )}

          {screen === 'quiz' && cur && (
            <>
              <div className="top">
                <div className="brand">
                  <div className="logo">N</div>
                  <div>
                    <div className="title">NeuroQuest</div>
                    <div className="subtitle">General Knowledge</div>
                  </div>
                </div>
                <div className="hud">
                  <div className="pill"><span className="dot" />Q <span className="qcount-num">{idx + 1}/{activeSet.length}</span></div>
                  <div className="pill">⭐ Score: <span className="score-num">{score}</span></div>
                  <button
                    type="button"
                    className="music-btn"
                    onClick={toggleMute}
                    title={musicMuted ? 'Unmute music' : 'Mute music'}
                    aria-label={musicMuted ? 'Unmute music' : 'Mute music'}
                  >
                    {musicMuted ? '🔇' : '🔊'}
                  </button>
                  <div className={ringClass}>
                    <svg viewBox="0 0 64 64">
                      <circle className="track" cx="32" cy="32" r="28" />
                      <circle
                        className="progress"
                        cx="32" cy="32" r="28"
                        style={{ strokeDashoffset: ringOffset }}
                      />
                    </svg>
                    <div className="num">{timeLeft}</div>
                  </div>
                </div>
              </div>

              <div className="progress"><div className="bar" style={{ width: `${barPct}%` }} /></div>

              <div className="qwrap">
                <span className="qnum">Question {idx + 1}</span>
                <div className="question" key={idx}>{cur.q}</div>
                <div className="options">
                  {cur.o.map((opt, i) => {
                    let cls = 'opt';
                    if (locked) {
                      cls += ' locked';
                      if (i === cur.a) cls += ' correct';
                      else if (i === picked) cls += ' wrong';
                    }
                    return (
                      <div key={`${idx}-${i}`} className={cls} onClick={() => choose(i)}>
                        <span className="marker">{letters[i]}</span>{opt}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="footer">
                <div className="hint">{hint}</div>
                <button className="btn" onClick={next} disabled={!locked}>
                  {idx === activeSet.length - 1 ? 'See Result →' : 'Next →'}
                </button>
              </div>
            </>
          )}

          {screen === 'hr' && hrSet[hrIdx] && (() => {
            const cur = hrSet[hrIdx];
            const letters = ['A', 'B', 'C', 'D'];
            return (
              <>
                <div className="top">
                  <div className="brand">
                    <div className="logo">N</div>
                    <div>
                      <div className="title">NeuroQuest</div>
                      <div className="subtitle">HR Round · Behavioural</div>
                    </div>
                  </div>
                  <div className="hud">
                    <div className="pill"><span className="dot" />Q <span className="qcount-num">{hrIdx + 1}/{hrSet.length}</span></div>
                    <div className="pill">🤝 HR Score: <span className="score-num">{hrScore}</span></div>
                    <button type="button" className="music-btn" onClick={toggleMute} title={musicMuted ? 'Unmute' : 'Mute'}>
                      {musicMuted ? '🔇' : '🔊'}
                    </button>
                  </div>
                </div>
                <div className="progress"><div className="bar" style={{ width: `${((hrIdx) / hrSet.length) * 100}%` }} /></div>
                <div className="qwrap">
                  <span className="qnum">HR Q{hrIdx + 1}</span>
                  <div className="question" key={`hr-${hrIdx}`}>{cur.q}</div>
                  <div className="options">
                    {cur.o.map((opt, i) => {
                      let cls = 'opt';
                      if (hrLocked) {
                        cls += ' locked';
                        if (i === cur.a) cls += ' correct';
                        else if (i === hrPicked) cls += ' wrong';
                      }
                      return (
                        <div key={`hr-${hrIdx}-${i}`} className={cls} onClick={() => chooseHr(i)}>
                          <span className="marker">{letters[i]}</span>{opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="footer">
                  <div className="hint">{hint}</div>
                  <button className="btn" onClick={nextHr} disabled={!hrLocked}>
                    {hrIdx === hrSet.length - 1 ? 'See HR Result →' : 'Next →'}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast show">
          <div className="t-title">🎉 <span>{toast.title}</span></div>
          <div className="t-msg">{toast.msg}</div>
        </div>
      )}

      {/* Aptitude Result Modal */}
      {screen === 'result' && (
        <div className="modal">
          <div className="result">
            <div className={`badge ${passed ? 'pass' : 'fail'}`}>{passed ? 'Aptitude Cleared' : 'Try Again'}</div>
            <h2>{passed ? '🎉 Aptitude Round Cleared!' : 'Keep Practicing!'}</h2>
            <p>Here&apos;s how you performed on the aptitude challenge.</p>
            <div
              className="ring-result"
              style={{
                background: `conic-gradient(${passed ? 'var(--right)' : 'var(--wrong)'} ${pct}%, rgba(255,255,255,.08) 0)`,
              }}
            >
              <div className="num">{score}<small>/{activeSet.length}</small></div>
            </div>
            <p style={{ marginBottom: 20 }}>
              {passed
                ? `You scored ${score}/${activeSet.length}. Your case has been forwarded to HR — proceed to the next round.`
                : `You scored ${score}/${activeSet.length}. You need ${passMark} to clear. Restart and give it another shot!`}
            </p>
            {passed ? (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn" onClick={enterHrRound}>Continue to HR Round →</button>
                <button className="btn ghost" onClick={restart}>Restart ↻</button>
              </div>
            ) : (
              <button className="btn" onClick={restart}>Restart Challenge ↻</button>
            )}
          </div>
        </div>
      )}

      {/* HR loading overlay */}
      {screen === 'hr-loading' && (
        <div className="modal"><div className="result">
          <div className="badge pass">HR Round</div>
          <h2>Connecting to HR…</h2>
          <p>Loading behavioural questions from the API.</p>
          <div className="hr-spinner" />
        </div></div>
      )}

      {/* HR Result Modal */}
      {screen === 'hr-result' && (() => {
        const hrPct = hrSet.length ? Math.round((hrScore / hrSet.length) * 100) : 0;
        const hrPassed = hrScore >= Math.ceil(hrSet.length * 0.6);
        return (
          <div className="modal"><div className="result">
            <div className={`badge ${hrPassed ? 'pass' : 'fail'}`}>{hrPassed ? 'HR Cleared' : 'HR Round'}</div>
            <h2>{hrPassed ? '🤝 HR Round Cleared!' : 'HR Round Complete'}</h2>
            <p>Soft-skills scoring summary:</p>
            <div
              className="ring-result"
              style={{ background: `conic-gradient(${hrPassed ? 'var(--right)' : 'var(--wrong)'} ${hrPct}%, rgba(255,255,255,.08) 0)` }}
            >
              <div className="num">{hrScore}<small>/{hrSet.length}</small></div>
            </div>
            <p style={{ marginBottom: 20 }}>
              {hrPassed
                ? "Excellent — you're moving to the final round: company match."
                : "Review the textbook answers and try again to advance."}
            </p>
            {hrPassed ? (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn" onClick={enterCompanyMatch}>View Your Match →</button>
                <button className="btn ghost" onClick={restart}>Restart ↻</button>
              </div>
            ) : (
              <button className="btn" onClick={restart}>Restart ↻</button>
            )}
          </div></div>
        );
      })()}

      {/* Company Match overlay */}
      {(screen === 'company-loading' || screen === 'company') && (
        <div className="modal"><div className="result company-card">
          {screen === 'company-loading' && (
            <>
              <div className="badge pass">Final Round</div>
              <h2>Matching you with a company…</h2>
              <p>Querying the GitHub Organizations API.</p>
              <div className="hr-spinner" />
            </>
          )}
          {screen === 'company' && company && (
            <>
              <div className="badge pass">🏆 Offer Match</div>
              {company.avatar_url && (
                <img
                  src={company.avatar_url}
                  alt={company.login}
                  style={{ width: 88, height: 88, borderRadius: 16, margin: '6px auto 12px', display: 'block', border: '1px solid var(--glass-bd)' }}
                />
              )}
              <h2>{company.name || company.login}</h2>
              <p style={{ color: 'var(--text)', minHeight: 24 }}>
                {company.description || 'A great place to work.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0 18px', textAlign: 'left' }}>
                {company.location && <div className="pill">📍 {company.location}</div>}
                {company.blog && <div className="pill" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>🔗 {company.blog.replace(/^https?:\/\//, '')}</div>}
                {typeof company.public_repos === 'number' && <div className="pill">📦 {company.public_repos} repos</div>}
                {typeof company.followers === 'number' && <div className="pill">👥 {company.followers.toLocaleString()} followers</div>}
                {company.created_at && <div className="pill">📅 Since {new Date(company.created_at).getFullYear()}</div>}
                {company.twitter_username && <div className="pill">🐦 @{company.twitter_username}</div>}
              </div>
              <p style={{ marginBottom: 18 }}>
                Congratulations — you&apos;ve been matched with <b>{company.name || company.login}</b>. Use the links below to secure your interview.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {(company.blog || company.html_url) && (
                  <a
                    className="btn"
                    href={company.blog || company.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🌐 Visit Careers Page →
                  </a>
                )}
                {company.html_url && (
                  <a
                    className="btn ghost"
                    href={company.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    💼 View on GitHub
                  </a>
                )}
                {company.email && (
                  <a className="btn ghost" href={`mailto:${company.email}?subject=Interview application`}>
                    ✉ Apply via Email
                  </a>
                )}
                <button className="btn ghost" onClick={enterCompanyMatch}>🔄 Match Another</button>
                <button className="btn ghost" onClick={restart}>↻ Start Over</button>
              </div>
            </>
          )}
        </div></div>
      )}

      <ConfettiCanvas trigger={confetti} />

      {/* Optional theme music: drop your own MP3 at /public/music/theme.mp3 to override the synth fallback */}
      <audio ref={audioElRef} src="/music/theme.mp3" preload="none" loop />
    </>
  );
}
