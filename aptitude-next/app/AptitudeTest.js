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

/* ---------- Main Component ---------- */
export default function AptitudeTest() {
  const [questions, setQuestions] = useState([]);
  const [passMark, setPassMark] = useState(7);
  const [secondsPerQ, setSecondsPerQ] = useState(30);
  const [questionsPerTest, setQuestionsPerTest] = useState(10);
  const [loadError, setLoadError] = useState(null);

  const [screen, setScreen] = useState('intro'); // 'intro' | 'quiz' | 'result'
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

  // Start a fresh test — pulls unseen questions from localStorage pool
  const startTest = useCallback(() => {
    if (!questions.length) return;
    setActiveSet(buildSet(questions, questionsPerTest));
    setIdx(0); setScore(0); setPicked(null); setLocked(false);
    setHint("Tip: read carefully — the obvious answer isn't always right.");
    passNotifiedRef.current = false;
    // Begin Test counts as a user gesture — safe to start audio here
    ensureMusicStarted();
    setScreen('quiz');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, questionsPerTest]);

  const restart = useCallback(() => {
    stopTimer();
    setScreen('intro');
    setActiveSet([]); setIdx(0); setScore(0); setPicked(null); setLocked(false);
    passNotifiedRef.current = false;
  }, [stopTimer]);

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
                  disabled={!questions.length}
                >
                  {loadError ? '⚠ Failed to load questions' : !questions.length ? 'Loading questions…' : 'Begin Test →'}
                </button>
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

          {screen === 'result' && (
            <div className="intro">
              <div>
                <h1>NeuroQuest</h1>
                <div className="subtitle" style={{ marginBottom: 14 }}>General Knowledge · Gotham Edition</div>
                <p>Click below to start a new test.</p>
                <button className="btn" onClick={restart}>Begin Test →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast show">
          <div className="t-title">🎉 <span>{toast.title}</span></div>
          <div className="t-msg">{toast.msg}</div>
        </div>
      )}

      {/* Result Modal */}
      {screen === 'result' && (
        <div className="modal">
          <div className="result">
            <div className={`badge ${passed ? 'pass' : 'fail'}`}>{passed ? 'Passed' : 'Try Again'}</div>
            <h2>{passed ? '🎉 Congratulations! Exam Cleared!' : 'Keep Practicing!'}</h2>
            <p>Here&apos;s how you performed on the NeuroQuest Aptitude Challenge.</p>
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
                ? `You scored ${score}/${activeSet.length} — above the passing mark. You're ready for the interview round.`
                : `You scored ${score}/${activeSet.length}. You need ${passMark} to clear. Restart and give it another shot!`}
            </p>
            <button className="btn" onClick={restart}>Restart Challenge ↻</button>
          </div>
        </div>
      )}

      <ConfettiCanvas trigger={confetti} />

      {/* Optional theme music: drop your own MP3 at /public/music/theme.mp3 to override the synth fallback */}
      <audio ref={audioElRef} src="/music/theme.mp3" preload="none" loop />
    </>
  );
}
