"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import cfg from "../data/config";

/* ---------- global canvas FX (confetti / bursts / rain) ---------- */
const fx = { rain: 0 };
const COL = ["#ff6b9d", "#ffc247", "#5eead4", "#a78bfa", "#ff7a59", "#ffffff"];
function Fx() {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, x = c.getContext("2d");
    let P = [], raf, W, H;
    const rs = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    rs(); addEventListener("resize", rs);
    fx.burst = (px, py, n = 40, o = {}) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, s = (o.s || 6) * Math.random() + 1;
        P.push({ x: px, y: py, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0), r: 2 + Math.random() * 4,
          c: o.c || COL[i % COL.length], l: 1, d: o.d || 0.015, g: o.g ?? 0.12, sq: !o.round && Math.random() < 0.4, rot: Math.random() * 6,
          r: o.size ? o.size + Math.random() * o.size : 2 + Math.random() * 4 });
      }
    };
    const loop = () => {
      x.clearRect(0, 0, W, H);
      if (fx.rain && Math.random() < 0.5)
        P.push({ x: Math.random() * W, y: -10, vx: Math.random() * 2 - 1, vy: 2 + Math.random() * 2, r: 3 + Math.random() * 3,
          c: COL[Math.floor(Math.random() * 6)], l: 1, d: 0.002, g: 0.01, sq: true, rot: Math.random() * 6 });
      P = P.filter((p) => p.l > 0 && p.y < H + 20);
      for (const p of P) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.l -= p.d; p.rot += 0.1;
        x.globalAlpha = Math.max(p.l, 0); x.fillStyle = p.c;
        if (p.sq) { x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); x.restore(); }
        else { x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.28); x.fill(); }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", rs); };
  }, []);
  return <canvas ref={ref} className="fx" />;
}

function Stars() {
  const [s, setS] = useState([]);
  useEffect(() => setS(Array.from({ length: 70 }, () => ({ l: Math.random() * 100, t: Math.random() * 100, d: Math.random() * 3, z: Math.random() * 2 + 1 }))), []);
  return s.map((a, i) => <i key={i} className="star" style={{ left: a.l + "%", top: a.t + "%", animationDelay: a.d + "s", width: a.z, height: a.z }} />);
}

function Snowfall() {
  return (
    <div className="snow-layer" aria-hidden="true">
      {Array.from({ length: 42 }, (_, i) => <i key={i} className="snowflake" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-((i * 13) % 18)}s`, animationDuration: `${9 + (i * 7) % 10}s`, width: `${3 + (i * 3) % 5}px`, height: `${3 + (i * 3) % 5}px` }} />)}
    </div>
  );
}

function useTyped(text, speed, on) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(t), v) : v + 1)), speed);
    return () => clearInterval(t);
  }, [on, text, speed]);
  return text.slice(0, n);
}
const later = (fn, ms) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); };

/* ---------- 0. Loader ---------- */
const loaderPath = "M24 126 C92 145 143 123 199 105 C238 93 267 95 296 113 C314 124 325 133 337 139 C312 127 306 102 318 82 C331 60 354 66 363 91 C367 101 369 108 369 115 C370 93 380 70 397 66 C419 60 433 83 427 106 C421 130 399 147 374 158 C359 164 349 157 359 145 C371 132 405 121 431 112 C471 98 503 105 534 111";
function Loader({ go }) {
  useEffect(() => {
    const t = setTimeout(go, 3500);
    return () => clearTimeout(t);
  }, [go]);
  return (
    <div className="scene loader-scene" role="status" aria-label={`A birthday surprise for ${cfg.name} is on its way`}>
      <svg className="loader-art" viewBox="0 0 560 200" role="img" aria-label="A red line drawing a heart">
        <path id="loader-trace" className="loader-trace" pathLength="1" d={loaderPath} />
        <circle className="loader-dot" r="3.5">
          <animateMotion dur="3.2s" fill="freeze" path={loaderPath} />
        </circle>
      </svg>
    </div>
  );
}

/* ---------- 1. Heart + Bow ---------- */
function BowScene({ go }) {
  const box = useRef(), heart = useRef(), bow = useRef(), nock = useRef(), drag = useRef(null);
  const shot = useRef(false);
  const [cen, setCen] = useState(null);
  const [a, setA] = useState({ x: 0, y: 0, stringX: 0, stringY: 0, fly: false });
  const [hit, setHit] = useState(false), [wipe, setWipe] = useState(false);
  useEffect(() => {
    const measure = () => {
      if (!box.current || !heart.current || !nock.current || !bow.current) return;
      const b = box.current.getBoundingClientRect(), h = heart.current.getBoundingClientRect(), w = nock.current.getBoundingClientRect(), bowRect = bow.current.getBoundingClientRect();
      const bx = w.left + w.width / 2 - b.left, by = w.top + w.height / 2 - b.top, hx = h.left + h.width / 2 - b.left, hy = h.top + h.height / 2 - b.top;
      const ang = Math.atan2(hy - by, hx - bx);
      const scale = Math.min(bowRect.width / 150, bowRect.height / 160);
      setCen({ bx, by, hx, hy, ang, ux: Math.cos(ang), uy: Math.sin(ang), scaleX: scale, scaleY: scale, ox: b.left, oy: b.top });
    };
    measure();
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, []);
  const shoot = () => {
    if (!cen || shot.current) return;
    shot.current = true;
    const arrowLength = Math.min(108, Math.max(84, innerWidth * 0.08));
    const arrowTravel = arrowLength * 0.93;
    setA({
      x: cen.hx - cen.bx - arrowTravel * cen.ux,
      y: cen.hy - cen.by - arrowTravel * cen.uy,
      stringX: 0,
      stringY: 0,
      fly: true,
    });
    later(() => { fx.burst(cen.ox + cen.hx, cen.oy + cen.hy, 150, { c: "#ff4d8d", s: 13, size: 5, d: 0.009, g: 0.025, round: true }); setHit(true); }, 480);
    later(() => setWipe(true), 900);
    later(go, 2100);
  };
  const down = (e) => {
    if (a.fly || !e.target.closest?.(".bow, .arrow")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, pull: 0 };
  };
  const move = (e) => {
    if (!drag.current || !cen) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    const pull = Math.min(120, Math.max(0, -(dx * cen.ux + dy * cen.uy)));
    drag.current.pull = pull;
    const x = -cen.ux * pull, y = -cen.uy * pull;
    setA({ x, y, stringX: x, stringY: y, fly: false });
  };
  const up = () => {
    if (!drag.current || !cen) return;
    const pull = drag.current.pull;
    drag.current = null;
    if (pull < 25) return setA({ x: 0, y: 0, stringX: 0, stringY: 0, fly: false });
    shoot();
  };
  return (
    <div className="scene bow-scene" ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{ touchAction: "none" }}>
      <button className="scene-back" onClick={() => window.location.reload()}>← Back</button>
      <h2 className="bow-title">a little something, for you</h2>
      <div ref={heart} className={"heart bow-heart" + (hit ? " hit" : "")} aria-label="A shiny pink heart">
        <svg viewBox="0 0 180 170" aria-hidden="true">
          <defs>
            <linearGradient id="heart-fill" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#ff9cbd" />
              <stop offset=".48" stopColor="#fa5790" />
              <stop offset="1" stopColor="#e9165d" />
            </linearGradient>
            <filter id="heart-shadow" x="-.35" y="-.3" width="1.7" height="1.8">
              <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
              <feOffset dy="7" />
              <feComponentTransfer><feFuncA type="linear" slope=".25" /></feComponentTransfer>
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path d="M90 160 C78 149 10 98 10 51 C10 19 31 4 55 4 C71 4 83 13 90 30 C97 13 109 4 125 4 C149 4 170 19 170 51 C170 98 102 149 90 160Z" fill="url(#heart-fill)" filter="url(#heart-shadow)" />
          <ellipse cx="55" cy="47" rx="19" ry="12" fill="#fff" opacity=".82" />
        </svg>
      </div>
      <svg ref={bow} className="bow" width="150" height="160" viewBox="0 0 150 160" style={{ left: "21%", bottom: "17%" }} aria-label="Wooden bow">
        <defs>
          <linearGradient id="bow-wood" x1="35" y1="15" x2="132" y2="132" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8a5a39" />
            <stop offset=".48" stopColor="#57351f" />
            <stop offset="1" stopColor="#9a6844" />
          </linearGradient>
          <linearGradient id="bowstring" x1="60" y1="20" x2="130" y2="132" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f0d6b4" />
            <stop offset=".55" stopColor="#b69778" />
            <stop offset="1" stopColor="#f4dfc6" />
          </linearGradient>
        </defs>
        <path d="M65 12 C45 7 43 25 39 47 C34 74 27 106 40 119 C44 125 52 129 64 131 C89 135 112 138 132 136" fill="none" stroke="#4e321f" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M65 12 C45 7 43 25 39 47 C34 74 27 106 40 119 C44 125 52 129 64 131 C89 135 112 138 132 136" fill="none" stroke="url(#bow-wood)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M65 12 L${99 + a.stringX / (cen?.scaleX || 1)} ${73 + a.stringY / (cen?.scaleY || 1)} L132 136`} fill="none" stroke="url(#bowstring)" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 108 Q48 104 55 111 L62 126 Q57 133 49 131 L38 123 Q35 116 40 108Z" fill="#57351f" stroke="#3f291a" strokeWidth="1.5" />
        <circle ref={nock} cx="99" cy="73" r="6" fill="#fff" fillOpacity=".01" />
      </svg>
      {cen && (
        <svg className={"arrow" + (a.fly ? " fly" : "")} viewBox="0 0 100 16" role="button" tabIndex={a.fly ? -1 : 0} aria-label="Pull back and release the arrow" onClick={shoot} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); shoot(); } }} style={{ left: cen.bx - 7, top: cen.by - 9, transformOrigin: "7% 50%", transform: `translate(${a.x}px,${a.y}px) rotate(${cen.ang}rad)` }}>
          <defs>
            <linearGradient id="arrow-shaft" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#70472d" />
              <stop offset=".5" stopColor="#b58b61" />
              <stop offset="1" stopColor="#70472d" />
            </linearGradient>
          </defs>
          <path d="M5 8 L89 8" stroke="#53341f" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M8 7.5 L84 7.5" stroke="url(#arrow-shaft)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M7 8 C1 5 0 2 0 2 C8 2 16 4 22 8 C14 10 7 13 2 15 C2 12 3 10 7 8Z" fill="#df3970" stroke="#a92351" strokeWidth=".8" strokeLinejoin="round" />
          <path d="M8 8 C4 9 2 13 2 15 C11 14 18 11 23 8 C17 6 11 3 5 2 C5 4 6 6 8 8Z" fill="#f67b9f" stroke="#c33863" strokeWidth=".8" strokeLinejoin="round" />
          <path d="M84 4 L100 8 L84 12 L89 8Z" fill="#e6ad48" stroke="#835822" strokeWidth=".8" strokeLinejoin="round" />
          <path d="M87 6 L96 8 L87 10" fill="none" stroke="#fff0cf" strokeWidth="1" strokeLinecap="round" />
          <path d="M5 8 L15 6 M5 8 L15 10" stroke="#fff0d8" strokeWidth=".9" />
        </svg>
      )}
      <div className="hint bow-hint">PULL &amp; RELEASE</div>
      <div className={"wipe" + (wipe ? " on" : "")} />
    </div>
  );
}

/* ---------- 2. Happy Birthday text ---------- */
function Hb({ go }) {
  useEffect(() => later(go, 3200), []);
  const L = (t, o, color) => t.split("").map((c, i) => <span key={i} style={{ animationDelay: o + i * 0.07 + "s", color: color || "inherit" }}>{c === " " ? "\u00A0" : c}</span>);
  return <div className="scene"><div className="big"><div>{L("Happy", 0)}</div><div>{L("Birthday", 0.5)}</div><div>{L("my love ", 1)}{L("DILWIL", 1.5, "#FFD700")}</div></div></div>;
}

/* ---------- 3. Heart tree ---------- */
const rnd = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
function useTree() {
  const br = [], ln = [], r = rnd(42);
  const g = (x, y, a, l, d) => {
    if (d > 4) return;
    const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
    br.push({ x, y, x2, y2, w: (5 - d) * 2.4, d, l });
    g(x2, y2, a - 0.5, l * 0.72, d + 1); g(x2, y2, a + 0.5, l * 0.72, d + 1);
  };
  g(200, 405, -Math.PI / 2, 76, 1);
  const cols = ["#ff5c93", "#ff7fa8", "#ffb347", "#ffd166", "#f43f7a", "#ff8c69"];
  for (let i = 0; i < 420; i++) {
    const t = r() * 6.28, k = Math.sqrt(r());
    const hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    ln.push({ l: ((200 + hx * 11 * k) / 400) * 100, t: ((220 - hy * 11 * k) / 600) * 100, c: cols[i % 6], s: 18 + r() * 20, d: 0.65 + i * 0.005 });
  }
  return { br, ln };
}

const timeLabel = (time) => {
  if (!Number.isFinite(time)) return "0:00";
  return `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
};

function MusicControls({ player, compact = false }) {
  const { tracks, trackIndex, playing, currentTime, duration, loop, volume, error } = player;
  const track = tracks[trackIndex];
  const disabled = !track;

  return (
    <div className={`music-controls${compact ? " compact" : ""}`} onClick={(event) => event.stopPropagation()}>
      <div className="music-track-info">
        <span className={`music-bars${playing ? " playing" : ""}`} aria-hidden="true"><i /><i /><i /><i /></span>
        <div>
          <strong>{track?.title || (error ? "Music unavailable" : "Loading your music...")}</strong>
          <small>{track ? `${trackIndex + 1} / ${tracks.length}` : error || "Your birthday playlist"}</small>
        </div>
      </div>
      <div className="music-main-controls">
        <button type="button" aria-label="Previous track" title="Previous track" disabled={disabled} onClick={player.previous}>⏮</button>
        <button type="button" className="music-play" aria-label={playing ? "Pause music" : "Play music"} title={playing ? "Pause" : "Play"} disabled={disabled} onClick={player.toggle}>
          {playing ? "Ⅱ" : "▶"}
        </button>
        <button type="button" aria-label="Next track" title="Next track" disabled={disabled} onClick={player.next}>⏭</button>
        <button type="button" className={`music-loop${loop ? " active" : ""}`} aria-label={loop ? "Turn loop off" : "Loop current track"} title="Loop current track" aria-pressed={loop} onClick={player.toggleLoop}>↻</button>
      </div>
      <div className="music-progress">
        <span>{timeLabel(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          aria-label="Seek music"
          disabled={disabled || !duration}
          onChange={(event) => player.seek(Number(event.target.value))}
        />
        <span>{timeLabel(duration)}</span>
      </div>
      <div className="music-extra-controls">
        <button type="button" aria-label={player.shuffle ? "Turn shuffle off" : "Turn shuffle on"} title="Shuffle" aria-pressed={player.shuffle} className={player.shuffle ? "active" : ""} onClick={player.toggleShuffle}>🔀</button>
        <label>
          <span aria-hidden="true">🔉</span>
          <input type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volume" onChange={(event) => player.setVolume(Number(event.target.value))} />
        </label>
      </div>
    </div>
  );
}

function TreeScene({ go }) {
  const { br, ln } = useTree();
  const [rdy, setR] = useState(false);
  const message = "Today, Tomorrow, Ever, Forever";
  const [typedMessage, setTypedMessage] = useState("");
  useEffect(() => {
    let index = 0;
    let timer;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        index += 1;
        setTypedMessage(message.slice(0, index));
        if (index >= message.length) clearInterval(timer);
      }, 85);
    }, 2400);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => later(() => setR(true), 5000), []);
  return (
    <div className="scene" onClick={() => rdy && go()}>
      {Array.from({ length: 14 }, (_, i) => <span key={i} className="fall" style={{ left: (i * 7.3) % 100 + "%", fontSize: 12 + (i % 4) * 4, animationDuration: 7 + (i % 5) * 2 + "s", animationDelay: -i * 1.3 + "s" }}>♥</span>)}
      <div className="tcard">
        <small className="tcard-intro">it&apos;s officially your day</small>
        <h1><span className="tcard-happy">Happy</span><span className="tcard-birthday">Birthday</span></h1>
        <h2 className="tcard-love">My Love <span>Dilwil</span></h2>
        <p className="tcard-message">I Love You <span className="tcard-typed">{typedMessage}</span>{typedMessage === message && <span className="tcard-emojis"> 🤗❤️</span>}</p>
      </div>
      <div className="tree">
        <svg viewBox="0 0 400 600">
          <line className="grow" style={{ "--l": 180 }} x1="200" y1="600" x2="200" y2="420" stroke="#6b3a45" strokeWidth="16" strokeLinecap="round" />
          {br.map((b, i) => <line key={i} className="grow" style={{ "--l": b.l, animationDelay: 0.8 + b.d * 0.2 + "s" }} x1={b.x} y1={b.y} x2={b.x2} y2={b.y2} stroke="#6b3a45" strokeWidth={b.w} strokeLinecap="round" />)}
        </svg>
        {ln.map((h, i) => <span key={i} className="lf" style={{ left: h.l + "%", top: h.t + "%", color: h.c, fontSize: h.s, animationDelay: h.d + "s" }}><span className="heart-leaf">♥</span></span>)}
        <div className="tree-ground" aria-hidden="true">
          <span className="ground-stroke" />
          {Array.from({ length: 11 }, (_, i) => <i key={i} style={{ left: `${i * 10}%`, animationDelay: `${0.7 + i * 0.06}s` }} />)}
        </div>
      </div>
      {rdy && <div className="hint tree-hint">tap anywhere to continue</div>}
    </div>
  );
}

/* ---------- 4. Cake ---------- */
function CakeScene({ go }) {
  const [st, setSt] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    fx.rain = 1;
    const c = [later(() => setSt(1), 2800), later(() => { setSt(2); fx.burst(innerWidth / 2, innerHeight / 2 - 20, 90, { c: "#ffb347", s: 8, up: 4 }); }, 3800)];
    return () => { fx.rain = 0; c.forEach((f) => f()); };
  }, []);
  const fullWish = "Happy Birthday, Anubhuti Prajapati!";
  const wish = useTyped(fullWish, 70, st >= 2);
  const wishDone = wish === fullWish;
  useEffect(() => {
    if (!wishDone) return;
    const timer = setTimeout(() => setReady(true), 2800);
    return () => clearTimeout(timer);
  }, [wishDone]);
  const ly = ["#f48fb1", "#ec6fa0", "#f48fb1"];
  return (
    <div className="scene cake-scene" onClick={() => ready && go()}>
      <h2 className="ttl">First things first 🎂</h2>
      <div className="cake-wrap">
        <div className="cake">
          {ly.map((c, i) => <div key={i} className="l" style={{ background: c, bottom: 8 + i * 22, animationDelay: 0.45 + i * 0.65 + "s" }} />)}
          <div className="ice">{[10, 43, 82, 121, 154].map((l, i) => <i key={i} style={{ left: l, height: 12 + (i % 3) * 7, animationDelay: 2.8 + i * 0.15 + "s" }} />)}</div>
          <div className={"candle" + (st >= 2 ? " lit" : "")}><div className="flame" /></div>
          <div className="plate" />
          <div className="cake-sprinkles" aria-hidden="true">✦　·　✦　·　✦</div>
        </div>
      </div>
      <div className={"wish" + (st >= 2 ? " wish-visible" : "")}>{wish}</div>
      {wishDone && (
        <div className="cake-poem">
          <p className="cake-poem-line poem-one">Waada hai mera ki har kadam par tumhara hath thame chalunga, chahe rasta kaisa bhi ho.</p>
          <p className="cake-poem-line poem-two">Tumhari har khushi meri zimmedari hogi aur tumhari har mushkil me main tumhare sath khada rahunga.</p>
          <p className="cake-poem-line poem-three">Janamdin mubarak ho meri jaan, main umr bhar tumse aisi hi beshumar mohabbat karne ka waada karta hu.</p>
        </div>
      )}
      <div className="cake-prompt">
        {st < 2 ? "Baking something sweet..." : ready ? "tap anywhere to continue" : wishDone ? "" : "Make a wish 🕯️"}
      </div>
    </div>
  );
}

/* ---------- 5. Balloons ---------- */
function Balloons({ go }) {
  const pos = [[5, 24, "#f472b6"], [26, 5, "#a78bfa"], [46, 28, "#fbbf24"], [62, 3, "#2dd4bf"], [78, 24, "#fb7185"]];
  const [gone, setGone] = useState([]);
  const [popping, setPopping] = useState([]);
  const popTimers = useRef([]);
  const rc = ["#f472b6", "#fbbf24", "#a78bfa", "#2dd4bf", "#fb7185"];
  useEffect(() => () => popTimers.current.forEach(clearTimeout), []);
  const pop = (i, e) => {
    if (gone.includes(i) || popping.includes(i)) return;
    const r = e.currentTarget.getBoundingClientRect();
    fx.burst(r.left + r.width / 2, r.top + r.height / 2, 46, { c: pos[i][2], s: 7, up: 1.5, round: true });
    setPopping((items) => [...items, i]);
    popTimers.current.push(setTimeout(() => {
      setGone((items) => [...items, i]);
      setPopping((items) => items.filter((item) => item !== i));
    }, 280));
  };
  const all = gone.length === 5;
  const compactScale = [1, 0.9, 0.8, 0.7, 0.6, 0][gone.length];
  return (
    <div className="scene balloons-scene">
      <Snowfall />
      <h2 className="balloons-title">Pop the balloons 🎈</h2>
      <p className="balloons-subtitle">5 balloons. Each one holds a reason you&apos;re loved. Pop them all 🎈</p>
      <div className="balloon-area" data-gone={gone.length} style={{ "--balloon-scale": compactScale }}>
        <div className="balloon-cluster">
          {pos.map((p, i) => !gone.includes(i) && <button key={i} type="button" className={"bl" + (popping.includes(i) ? " popping" : "")} aria-label={`Pop balloon ${i + 1}`} onClick={(e) => pop(i, e)} style={{ left: p[0] + "%", top: p[1] + "%", background: `radial-gradient(circle at 35% 30%,#fff8,${p[2]} 40%)`, animationDelay: i * 0.4 + "s" }} />)}
        </div>
      </div>
      <div className="rs">
        {gone.map((g, i) => <div key={g} className="rc" style={{ "--c": rc[g], animationDelay: `${i * 0.12}s` }}><small>REASON NO.{i + 1} 💘</small><div>{cfg.reasons[g] ?? cfg.reasons[i]}</div></div>)}
      </div>
      {all && <div className="balloons-finale"><p>...and a thousand more reasons 💛</p><button className="btn" onClick={go}>Keep going 💛</button></div>}
    </div>
  );
}

/* ---------- 6. Envelope + Letter ---------- */
function Letter() {
  const router = useRouter();
  const [ph, setPh] = useState(0);
  const open = () => { if (ph) return; setPh(1); fx.burst(innerWidth / 2, innerHeight / 2, 25, { s: 4, up: 3 }); later(() => setPh(2), 2000); };
  const txt = useTyped(cfg.letter, 55, ph === 2);
  const done = txt.length >= cfg.letter.length;
  useEffect(() => { if (done) return later(() => setPh(3), 800); }, [done]);
  if (ph >= 2)
    return (
      <div className="scene letter-scene">
        <Snowfall />
        <div className="letter"><b>Dear Anubhuti,</b>{txt}{done && <div className="sig">With all my love,<br />— Khushdil Prajapati</div>}<span className="letter-kiss">💋</span></div>
        {ph === 3 && <button className="btn" style={{ marginTop: 18 }} onClick={() => router.push("/puzzle")}>Continue</button>}
      </div>
    );
  return (
    <div className="scene letter-scene">
      <Snowfall />
      <h2 className="letter-title">One last thing, Anubhuti Prajapati...</h2>
      <p className="letter-subtitle">Khushdil Prajapati wrote you a letter.</p>
      <div className={"env" + (ph ? " open" : "")} onClick={open}>
        <div className="paper" /><div className="fold" /><div className="flap" />
        <div className="seal">A</div>
      </div>
      {!ph && <div className="letter-instruction"><span>👆</span>Tap to open your letter</div>}
    </div>
  );
}

/* ---------- 7. Surprise video ---------- */
function Surprise({ go }) {
  const [bad, setBad] = useState(false);
  useEffect(() => { fx.rain = 1; const c = bad ? later(go, 9000) : () => {}; return () => { fx.rain = 0; c(); }; }, [bad]);
  const fl = ["#f9c74f", "#f9844a", "#43aa8b", "#a78bfa", "#f472b6", "#fb7185", "#f9c74f"];
  return (
    <div className="scene">
      <div className="bunt">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ background: fl[i % 7] }} />)}</div>
      <div className="frame">
        {bad ? <div className="ph">🐱🎂<br />🐱🐱🐱</div> : <video src="/media/surprise.mp4" autoPlay muted playsInline onError={() => setBad(true)} onEnded={go} />}
        <div className="sb" style={{ left: -6, bottom: 10, background: "#f472b6" }} /><div className="sb" style={{ right: -6, bottom: 60, background: "#2dd4bf" }} />
      </div>
      <button className="skip" onClick={go}>Skip ›</button>
    </div>
  );
}

/* ---------- 8. Finale ---------- */
function Finale() {
  const [img, setImg] = useState(true);
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => fx.burst(Math.random() * innerWidth, 60 + Math.random() * innerHeight * 0.5, 45, { c: COL[Math.floor(Math.random() * 5)], s: 5, g: 0.04, d: 0.012, round: true }), 900);
    fx.rain = 1; return () => { clearInterval(t); fx.rain = 0; };
  }, []);
  const share = () => router.push("/puzzle");
  return (
    <div className="scene">
      <div className="fin1">HAPPY<br />BIRTHDAY<em>{cfg.name}!</em></div>
      <div className="stk">{img ? <img src="/media/sticker.png" alt="" onError={() => setImg(false)} /> : "🐱🎩💐"}</div>
      <p style={{ fontSize: 12 }}>Made with love, just for you — <b style={{ color: "#f5b84a" }}>{cfg.sender}</b> 💛</p>
      <button className="btn" style={{ marginTop: 14 }} onClick={share}>{cfg.finaleButton}</button>
      <p style={{ fontSize: 11, opacity: 0.7, marginTop: 10 }}>{cfg.finaleNote}</p>
    </div>
  );
}

/* ---------- App ---------- */
export default function Page() {
  const [s, setS] = useState(0);
  const au = useRef();
  const [tracks, setTracks] = useState([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [musicError, setMusicError] = useState("");
  const [showMusicControls, setShowMusicControls] = useState(false);
  const go = useCallback(() => setS((v) => v + 1), []);
  const bg = s <= 1 ? "bg0" : s === 2 ? "bg2" : s === 3 ? "bg3" : "bg4";
  useEffect(() => {
    let active = true;
    fetch("/api/music")
      .then((response) => {
        if (!response.ok) throw new Error(`Music list request failed (${response.status})`);
        return response.json();
      })
      .then((items) => {
        if (active) setTracks(items);
      })
      .catch((error) => {
        console.error("Could not load the music playlist", error);
        if (active) setMusicError("Could not load playlist");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const audio = au.current;
    if (!audio || !tracks.length) return;
    audio.load();
    if (playing && s === 3) {
      audio.play().catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Could not play the selected music track", error);
          setMusicError("Playback failed. Try pressing play again.");
          setPlaying(false);
        }
      });
    }
  }, [trackIndex, tracks, s]);

  useEffect(() => {
    if (s === 3) return;
    au.current?.pause();
    setPlaying(false);
    setShowMusicControls(false);
  }, [s]);

  useEffect(() => {
    if (au.current) au.current.volume = volume;
  }, [volume]);

  const play = () => {
    const audio = au.current;
    if (!audio || !tracks.length || s !== 3) return;
    setMusicError("");
    audio.play().then(() => {
      setPlaying(true);
    }).catch((error) => {
      if (error.name !== "AbortError") {
        console.error("Could not start music playback", error);
        setMusicError("Playback failed. Try pressing play again.");
        setPlaying(false);
      }
    });
  };
  const toggle = (event) => {
    event?.stopPropagation();
    setShowMusicControls((visible) => !visible);
  };
  const togglePlayback = () => {
    if (playing) {
      au.current?.pause();
      setPlaying(false);
    } else play();
  };
  const chooseTrack = (index) => {
    if (!tracks.length) return;
    setCurrentTime(0);
    setDuration(0);
    setTrackIndex((index + tracks.length) % tracks.length);
  };
  const stepTrack = (direction) => {
    if (shuffle && direction > 0 && tracks.length > 1) {
      let nextIndex = trackIndex;
      while (nextIndex === trackIndex) nextIndex = Math.floor(Math.random() * tracks.length);
      chooseTrack(nextIndex);
      return;
    }
    chooseTrack(trackIndex + direction);
  };
  const player = {
    tracks,
    trackIndex,
    playing,
    currentTime,
    duration,
    loop,
    shuffle,
    volume,
    error: musicError,
    toggle: togglePlayback,
    previous: () => {
      if (au.current && au.current.currentTime > 3) {
        au.current.currentTime = 0;
        return;
      }
      stepTrack(-1);
    },
    next: () => stepTrack(1),
    seek: (time) => {
      if (au.current) au.current.currentTime = time;
      setCurrentTime(time);
    },
    setVolume,
    toggleLoop: () => setLoop((value) => !value),
    toggleShuffle: () => setShuffle((value) => !value),
  };
  const Sc = [Loader, BowScene, Hb, TreeScene, CakeScene, Balloons, Letter, Surprise, Finale][s];
  return (
    <div className={"app " + bg}>
      {s >= 4 && <Stars />}
      <audio
        ref={au}
        src={tracks[trackIndex]?.src}
        loop={loop}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => { if (s === 3) stepTrack(1); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          if (tracks.length) {
            setMusicError("This music file could not be played.");
            setPlaying(false);
          }
        }}
      />
      {s === 3 && <button className={`snd${showMusicControls ? " active" : ""}`} onClick={toggle} aria-label={showMusicControls ? "Hide music controls" : "Show music controls"} aria-expanded={showMusicControls} title={showMusicControls ? "Hide music controls" : "Show music controls"}>{showMusicControls ? "🔊" : "🔇"}</button>}
      <Sc key={s} go={go} />
      {s === 3 && showMusicControls && (
        <div className="music-player-anchor" onClick={(event) => event.stopPropagation()}>
          <MusicControls player={player} compact />
        </div>
      )}
      <Fx />
    </div>
  );
}
