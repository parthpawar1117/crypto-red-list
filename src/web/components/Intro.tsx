"use client";
/**
 * Three-second eclipse intro on the home page: a thin red "smile" of light grows into a huge eclipse rim
 * and RED LIST lands on it. Plays once per browser session and can be skipped (click, Esc, button).
 * The overlay is server-rendered so it covers the page from the first paint; a CSS fail-safe fades it
 * out even without JavaScript, and an inline script in the layout hides it for repeat visits and for
 * people who prefer reduced motion before anything is painted.
 */
import { useEffect, useRef, useState } from "react";
import { INTRO_SECONDS, INTRO_WORD, introFrame } from "../motion";

const KEY = "crl-intro";

export function Intro() {
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ring = useRef<HTMLCanvasElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const ui = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains("no-intro")) return; // already hidden by CSS
    try { sessionStorage.setItem(KEY, "1"); } catch { /* private mode: it just plays again on reload */ }
    // Coming back to / by client-side navigation should not replay it either.
    const finish = (ms: number) => window.setTimeout(() => { root.classList.add("no-intro"); setGone(true); }, ms);
    const canvas = ring.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const start = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const f = introFrame(t);
      const r = f.radius * Math.max(W, H * 1.6);
      const cx = W / 2, cy = f.bottom * H - r;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = f.rimOpacity;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = "#020103"; ctx.fill();
      const atm = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r);
      atm.addColorStop(0, "rgba(60,4,10,0)"); atm.addColorStop(0.75, "rgba(110,10,18,.3)"); atm.addColorStop(1, "rgba(255,70,40,.5)");
      ctx.fillStyle = atm; ctx.fill();
      ctx.restore();
      const conic = (rgb: string, a: number) => {
        const c = ctx.createConicGradient(Math.PI / 2, cx, cy);
        for (let i = 0; i <= 48; i++) {
          const ang = (i / 48) * 2 * Math.PI;
          const k = Math.max(0, 1 - Math.min(ang, 2 * Math.PI - ang) / f.span);
          c.addColorStop(i / 48, `rgba(${rgb},${a * Math.pow(k, 1.6)})`);
        }
        return c;
      };
      const pass = (rgb: string, a: number, lw: number, blur: number) => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = conic(rgb, a * f.rimOpacity * Math.min(f.pulse, 1.6));
        ctx.lineWidth = lw; ctx.shadowColor = `rgba(${rgb},1)`; ctx.shadowBlur = blur;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
        ctx.restore();
      };
      pass("120,8,16", 0.12, 120, 200);
      pass("150,10,20", 0.22, 46, 150);
      pass("255,40,20", 0.55, 26, 60);
      pass("255,110,80", 0.9, 8, 24);
      pass("255,235,225", 1, 2.6, 6);
      const ga = Math.sin(Math.PI * f.glint);
      if (ga > 0) {
        const ang = -0.7 + 1.4 * f.glint;
        const hx = cx + Math.sin(ang) * r, hy = cy + Math.cos(ang) * r;
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 180);
        g.addColorStop(0, `rgba(255,240,230,${0.9 * ga})`); g.addColorStop(0.25, `rgba(255,80,50,${0.4 * ga})`); g.addColorStop(1, "rgba(255,0,0,0)");
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(hx - 180, hy - 180, 360, 360); ctx.restore();
      }
      f.letters.forEach((l, i) => {
        const el = letters.current[i];
        if (!el) return;
        el.style.opacity = String(l.opacity);
        el.style.transform = `translate(${l.dx}px,${l.dy}px) scale(${l.scale})`;
        el.style.filter = l.blur > 0.05 ? `blur(${l.blur}px)` : "none";
      });
      if (ui.current) { ui.current.style.opacity = String(f.uiOpacity); ui.current.style.transform = `translateY(${(1 - f.uiOpacity) * 20}px)`; }
      if (t < INTRO_SECONDS) raf = requestAnimationFrame(draw);
      else { setLeaving(true); finish(650); }
    };
    raf = requestAnimationFrame(draw);

    const skip = () => { cancelAnimationFrame(raf); setLeaving(true); finish(600); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    canvas.parentElement?.addEventListener("click", skip);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, []);

  if (gone) return null;
  return (
    <div className={`intro${leaving ? " leaving" : ""}`} role="presentation" aria-hidden="true">
      <canvas ref={ring} />
      <div className="intro-word">
        {[...INTRO_WORD].map((c, i) => {
          const li = i > INTRO_WORD.indexOf(" ") ? i - 1 : i; // letter index, skipping the space
          return c === " " ? <span key={i} className="intro-gap" /> : <span key={i} ref={(el) => { letters.current[li] = el; }} className="intro-letter">{c}</span>;
        })}
      </div>
      <div className="intro-ui" ref={ui}>
        <p>Which crypto coins are going extinct?</p>
        <small>Top 500 coins · live CoinMarketCap data · backtested on 8 years</small>
      </div>
      <button type="button" className="intro-skip" tabIndex={-1}>Skip intro</button>
    </div>
  );
}
