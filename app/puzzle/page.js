"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import cfg from "../../data/config";
import "./puzzle.css";

const N = Math.min(5, Math.max(3, Math.floor(Number(cfg.puzzleGrid) || 4)));
const fmt = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const puzzleImage = "/media/part21.jpeg";

function PuzzleSnowfall() {
  return (
    <div className="snow-layer" aria-hidden="true">
      {Array.from({ length: 42 }, (_, index) => (
        <i key={index} className="snowflake" style={{
          left: `${(index * 37) % 100}%`,
          animationDelay: `${-((index * 13) % 18)}s`,
          animationDuration: `${9 + (index * 7) % 10}s`,
          width: `${3 + (index * 3) % 5}px`,
          height: `${3 + (index * 3) % 5}px`,
        }} />
      ))}
    </div>
  );
}

function CelebrationEffects() {
  const [hearts] = useState(() => Array.from({ length: 28 }, (_, index) => ({
    left: `${Math.random() * 100}%`,
    delay: `${-Math.random() * 8}s`,
    duration: `${5 + Math.random() * 7}s`,
    size: `${13 + Math.random() * 15}px`,
    sway: `${-35 + Math.random() * 70}px`,
    color: ["#f472b6", "#fb7185", "#c084fc", "#ff6b9d"][index % 4],
  })));
  const [fireworks] = useState(() => Array.from({ length: 5 }, (_, index) => {
    const color = ["#ff6b9d", "#ffc247", "#5eead4", "#a78bfa", "#ff7a59"][index];
    return {
      left: `${12 + Math.random() * 76}%`,
      height: `${26 + Math.random() * 52}vh`,
      delay: `${index * 0.65 + Math.random() * 0.45}s`,
      color,
      particles: Array.from({ length: 14 }, (_, particle) => {
        const angle = (Math.PI * 2 * particle) / 14 + Math.random() * 0.16;
        const distance = 28 + Math.random() * 48;
        return {
          x: `${Math.cos(angle) * distance}px`,
          y: `${-Math.sin(angle) * distance}px`,
          size: `${3 + Math.random() * 3}px`,
        };
      }),
    };
  }));

  return (
    <div className="celebration-effects" aria-hidden="true">
      <div className="celebration-hearts">
        {hearts.map((heart, index) => (
          <i key={index} style={{
            left: heart.left,
            "--fall-delay": heart.delay,
            "--fall-duration": heart.duration,
            "--heart-size": heart.size,
            "--heart-sway": heart.sway,
            color: heart.color,
          }}>♥</i>
        ))}
      </div>
      {fireworks.map((firework, index) => (
        <div key={index} className="firework" style={{
          left: firework.left,
          "--firework-height": firework.height,
          "--firework-delay": firework.delay,
          "--firework-color": firework.color,
        }}>
          <i className="firework-rocket" />
          {firework.particles.map((particle, particleIndex) => (
            <i key={particleIndex} className="firework-particle" style={{
              "--particle-x": particle.x,
              "--particle-y": particle.y,
              "--particle-size": particle.size,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function square(src) {
  return new Promise((resolve) => {
    const draw = (image) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 900;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve("");
        return;
      }

      if (image) {
        const side = Math.min(image.width, image.height);
        context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 900, 900);
      } else {
        const gradient = context.createLinearGradient(0, 0, 900, 900);
        gradient.addColorStop(0, "#ff9ec4");
        gradient.addColorStop(1, "#ffd08a");
        context.fillStyle = gradient;
        context.fillRect(0, 0, 900, 900);
        context.fillStyle = "#fff";
        context.textAlign = "center";
        context.font = "bold 520px sans-serif";
        context.fillText("♥", 450, 600);
        context.font = "bold 90px sans-serif";
        context.fillText(cfg.name, 450, 800);
      }
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    const image = new Image();
    image.onload = () => draw(image);
    image.onerror = () => draw(null);
    image.src = src;
  });
}

function shuffledTiles() {
  const tiles = [...Array(N * N).keys()];
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  if (tiles.every((tile, index) => tile === index)) [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
  return tiles;
}

export default function PuzzlePage() {
  const router = useRouter();
  const [image, setImage] = useState(null);
  const [order, setOrder] = useState(() => [...Array(N * N).keys()]);
  const [phase, setPhase] = useState("idle");
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [selected, setSelected] = useState(null);
  const [peek, setPeek] = useState(false);
  const [drag, setDrag] = useState(null);
  const dragStart = useRef(null);

  useEffect(() => {
    let active = true;
    square(puzzleImage).then((src) => {
      if (active) setImage(src);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const start = () => {
    setOrder(shuffledTiles());
    setMoves(0);
    setSeconds(0);
    setSelected(null);
    setPhase("play");
  };

  const swap = (first, second) => {
    if (first === second || phase !== "play") return;
    const next = [...order];
    [next[first], next[second]] = [next[second], next[first]];
    setOrder(next);
    setMoves((value) => value + 1);
    setSelected(null);
    if (next.every((tile, index) => tile === index)) setTimeout(() => setPhase("won"), 450);
  };

  const pointerDown = (event, index) => {
    if (phase !== "play") return;
    dragStart.current = { index, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event) => {
    const startPosition = dragStart.current;
    if (!startPosition) return;
    const dx = event.clientX - startPosition.x;
    const dy = event.clientY - startPosition.y;
    if (!startPosition.moved && Math.hypot(dx, dy) > 6) startPosition.moved = true;
    if (startPosition.moved) setDrag({ index: startPosition.index, dx, dy });
  };

  const pointerUp = (event) => {
    const startPosition = dragStart.current;
    dragStart.current = null;
    if (!startPosition) return;
    setDrag(null);
    if (!startPosition.moved) {
      if (selected === null) setSelected(startPosition.index);
      else if (selected === startPosition.index) setSelected(null);
      else swap(selected, startPosition.index);
      return;
    }
    const target = document.elementsFromPoint(event.clientX, event.clientY)
      .find((element) => element.dataset?.pos !== undefined && Number(element.dataset.pos) !== startPosition.index);
    if (target) swap(startPosition.index, Number(target.dataset.pos));
  };

  const cancelPointer = () => {
    dragStart.current = null;
    setDrag(null);
  };

  const playing = phase === "play";

  return (
    <main className="pz">
      <PuzzleSnowfall />
      <button className="pz-back" type="button" aria-label="Back to birthday" title="Back to birthday" onClick={() => router.push("/")}>←</button>
      <section className="pz-card" aria-label="Birthday picture puzzle">
        <div className="pz-top"><span>🧩 <b>A little puzzle</b></span></div>
        <p className="pz-tagline">Solve it and get the best gift made with your heart</p>
        <h1>Love U Bahut sara <span className="pz-name-highlight">Dilwill</span></h1>
        <p className="sub">{phase === "won" ? "you did it! 🎉" : "put the picture back together, piece by piece"}</p>

        <div className="pz-stats">
          <div className={`pill${playing ? "" : " off"}`}>Moves <b>{moves}</b></div>
          <div className={`pill${playing ? "" : " off"}`}>⏱ <b>{fmt(seconds)}</b></div>
          <button className={`pill peekb${playing ? "" : " off"}`} disabled={!playing}
            onPointerDown={() => setPeek(true)} onPointerUp={() => setPeek(false)}
            onPointerLeave={() => setPeek(false)} onPointerCancel={() => setPeek(false)}>
            👁 Hold to peek
          </button>
        </div>

        {phase === "won" ? (
          <div className="pz-complete-picture" style={{ backgroundImage: `url(${image})` }} role="img" aria-label="Completed birthday picture" />
        ) : (
          <div className="board" style={{ "--n": N }} aria-label={`${N} by ${N} picture puzzle`}>
            {image && order.map((piece, index) => (
              <button key={index} type="button" data-pos={index}
                aria-label={`Puzzle piece ${index + 1}${piece === index ? ", correct place" : ""}`}
                className={`tile${selected === index ? " sel" : ""}${playing && piece === index ? " ok" : ""}${drag?.index === index ? " drag" : ""}${!playing ? " lock" : ""}`}
                style={{
                  backgroundImage: `url(${image})`,
                  backgroundSize: `${N * 100}% ${N * 100}%`,
                  backgroundPosition: `${((piece % N) / (N - 1)) * 100}% ${(Math.floor(piece / N) / (N - 1)) * 100}%`,
                  transform: drag?.index === index ? `translate(${drag.dx}px,${drag.dy}px) scale(1.07)` : undefined,
                }}
                onPointerDown={(event) => pointerDown(event, index)}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={cancelPointer}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  if (selected === null) setSelected(index);
                  else swap(selected, index);
                }}
              />
            ))}
            {peek && image && <div className="peek" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />}
          </div>
        )}

        {phase === "idle" && <button className="go" onClick={start}>{cfg.puzzleStartText}</button>}
        {playing && <p className="hint2">Tap two pieces to swap them, or drag one onto another 💛</p>}
        {phase === "won" && <>
          <p className="res">Solved in <b>{moves}</b> moves · <b>{fmt(seconds)}</b></p>
          <button className="go" onClick={() => router.push("/gallery")}>Go for gift 🎁</button>
        </>}
      </section>

      {phase === "won" && <CelebrationEffects />}
    </main>
  );
}
