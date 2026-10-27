"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gallery.css";

function GalleryScene({ images, onBack, replayKey }) {
  const viewport = useRef(null);
  const heartTimers = useRef([]);
  const lastHeartAt = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(null);
  const [cursorHearts, setCursorHearts] = useState([]);
  const introImage = images.find((image) => image.type === "image");

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 1150);
    return () => clearTimeout(timer);
  }, [replayKey]);

  useEffect(() => {
    if (!revealed || !viewport.current) return;
    const root = viewport.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { root, rootMargin: "120px" });
    root.querySelectorAll("[data-gallery-card]").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [revealed, replayKey]);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelected(null);
    };
    addEventListener("keydown", closeOnEscape);
    return () => removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  useEffect(() => () => heartTimers.current.forEach(clearTimeout), []);

  const makeCursorHeart = (event) => {
    if (event.pointerType === "touch") return;
    const now = performance.now();
    if (now - lastHeartAt.current < 90) return;
    lastHeartAt.current = now;
    const id = now + Math.random();
    setCursorHearts((hearts) => [...hearts.slice(-10), { id, x: event.clientX, y: event.clientY }]);
    heartTimers.current.push(setTimeout(() => {
      setCursorHearts((hearts) => hearts.filter((heart) => heart.id !== id));
    }, 850));
  };

  return (
    <main className="gallery-viewport" ref={viewport} onPointerMove={makeCursorHeart}>
      <header className="gallery-header">
        <button className="gallery-back" onClick={onBack} type="button" aria-label="Back to puzzle" title="Back to puzzle">←</button>
        <div className="gallery-heading">
          <p>A little collection of memories</p>
          <h1>Our Gallery <span>♥</span></h1>
          <small><span aria-label="infinite">∞</span> moments, made with love</small>
        </div>
      </header>

      <button
        type="button"
        className="gallery-replay"
        aria-label="Replay gallery reveal"
        title="Replay gallery reveal"
        onClick={() => window.dispatchEvent(new Event("gallery:replay"))}
      >↻      </button>

      <section className={`gallery-wall${revealed ? " is-revealed" : ""}`} aria-label="Photo gallery">
        {images.map((image, index) => (
          <button
            type="button"
            className="gallery-card"
            key={image.src}
            data-gallery-card
            aria-label={image.type === "video" ? "Double-click to play video" : "Double-click to view photo"}
            style={{
              "--card-delay": `${(index % 8) * 70}ms`,
              "--card-width": `${76 + ((index * 23) % 25)}%`,
              "--card-tilt": `${((index * 7) % 9) - 4}deg`,
              "--card-shift": `${((index * 13) % 19) - 9}px`,
            }}
            onDoubleClick={() => setSelected(image)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") setSelected(image);
            }}
          >
            {image.type === "video" ? (
              <video
                src={image.src}
                muted
                loop
                playsInline
                preload="none"
                onMouseEnter={(event) => {
                  event.currentTarget.play().catch((error) => {
                    if (error.name !== "AbortError") console.error("Could not play gallery video preview", error);
                  });
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.pause();
                  event.currentTarget.currentTime = 0;
                }}
              />
            ) : <img src={image.src} alt="" loading="lazy" />}
          </button>
        ))}
      </section>

      {!revealed && introImage && (
        <div className="gallery-intro" key={replayKey} aria-hidden="true">
          <img src={introImage.src} alt="" />
          <span>Our memories</span>
        </div>
      )}

      {selected && (
        <div className="gallery-viewer" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setSelected(null)}>
          <button className="gallery-close" type="button" aria-label="Close photo" onClick={() => setSelected(null)}>×</button>
          {selected.type === "video" ? (
            <video src={selected.src} controls autoPlay playsInline onClick={(event) => event.stopPropagation()} />
          ) : <img src={selected.src} alt="" onClick={(event) => event.stopPropagation()} />}
        </div>
      )}
      {cursorHearts.map((heart) => (
        <i key={heart.id} className="cursor-heart" style={{ left: heart.x, top: heart.y }} aria-hidden="true">♥</i>
      ))}
    </main>
  );
}

export default function GalleryClient({ images }) {
  const router = useRouter();
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    const replay = () => setReplayKey((key) => key + 1);
    addEventListener("gallery:replay", replay);
    return () => removeEventListener("gallery:replay", replay);
  }, []);

  return (
    <GalleryScene
      key={replayKey}
      replayKey={replayKey}
      images={images}
      onBack={() => router.push("/puzzle")}
    />
  );
}
