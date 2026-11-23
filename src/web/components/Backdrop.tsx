"use client";
/**
 * The animated Web3 backdrop behind every page: one fixed canvas, a different scene per page so pages
 * never look alike. Home: flowing light ribbons. Time machine: orbits round an eclipse. Method: a block
 * network with pulses travelling between nodes. Coin sheets: a drifting constellation over a hex grid.
 * Every scene also reacts to the cursor, a soft glow follows it, and glass cards catch a spotlight and tilt.
 * Pauses when the tab is hidden; draws a single still frame for people who prefer reduced motion.
 */
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cardTilt, cursorPush, ribbonPoint } from "../motion";

type Scene = "ribbons" | "orbits" | "network" | "constellation";
const sceneFor = (path: string): Scene =>
  path.startsWith("/time-machine") ? "orbits" : path.startsWith("/method") ? "network" : path.startsWith("/coin") ? "constellation" : "ribbons";

const RIBBON_COLORS = [
  [255, 59, 47],
  [255, 122, 60],
  [177, 75, 255],
];

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function Backdrop() {
  const scene = sceneFor(usePathname() ?? "/");
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, last = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const r = rand(42);
    const nodes = Array.from({ length: 46 }, () => ({ x: r(), y: r(), vx: (r() - 0.5) * 0.012, vy: (r() - 0.5) * 0.012, p: r() * 6 }));
    const stars = Array.from({ length: 140 }, () => ({ x: r(), y: r(), z: r(), p: r() * 6 }));
    // Cursor: target position from pointer events, eased toward every frame so the motion feels fluid.
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, on: false, fresh: true };
    let par = { x: 0, y: 0 }; // -0.5..0.5 parallax from the cursor position

    const drawRibbons = (t: number) => {
      ctx.globalCompositeOperation = "lighter";
      const step = Math.max(14, w / 90);
      for (let k = 0; k < 3; k++) {
        const [cr, cg, cb] = RIBBON_COLORS[k]!;
        for (let s = 0; s < 28; s++) {
          const edge = 1 - Math.abs(s - 14) / 14;
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.05 + edge * 0.16})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let x = -40; x <= w + 40; x += step) {
            let X = x, y = ribbonPoint(k, s, x, t, w, h) - par.y * 40 * (k + 1);
            if (mouse.on) { const p = cursorPush(x, y, mouse.x, mouse.y, 130, 70); X += p.dx * 0.35; y += p.dy; }
            if (x === -40) ctx.moveTo(X, y); else ctx.lineTo(X, y);
          }
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawOrbits = (t: number) => {
      const cx = w * 0.72 - par.x * 60, cy = h * 0.42 - par.y * 40, base = Math.min(w, h) * 0.2;
      const g = ctx.createRadialGradient(cx, cy, base * 0.8, cx, cy, base * 1.35);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.18, "rgba(255,70,45,.55)"); g.addColorStop(0.3, "rgba(255,40,30,.12)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, base * 1.35, 0, 7); ctx.fill();
      ctx.fillStyle = "#05030a"; ctx.beginPath(); ctx.arc(cx, cy, base * 0.96, 0, 7); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const rx = base * (1.6 + i * 0.55), ry = rx * (0.32 + par.y * 0.12), tilt = -0.32 + par.x * 0.14;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
        ctx.strokeStyle = `rgba(${i % 2 ? "177,75,255" : "255,90,60"},${0.16 - i * 0.02})`;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.stroke();
        const a = t * (0.25 - i * 0.03) + i * 1.3;
        const px = Math.cos(a) * rx, py = Math.sin(a) * ry;
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 14);
        pg.addColorStop(0, "rgba(255,230,220,.95)"); pg.addColorStop(0.3, "rgba(255,80,50,.5)"); pg.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = pg; ctx.fillRect(px - 14, py - 14, 28, 28);
        ctx.restore();
      }
    };

    const drawNetwork = (t: number, dt: number) => {
      const pts = nodes.map((n) => {
        if (!reduced) { n.x = (n.x + n.vx * dt + 1) % 1; n.y = (n.y + n.vy * dt + 1) % 1; }
        const x = n.x * w, y = n.y * h;
        const push = mouse.on ? cursorPush(x, y, mouse.x, mouse.y, 110, 55) : { dx: 0, dy: 0 };
        return { x: x + push.dx, y: y + push.dy, p: n.p };
      });
      if (mouse.on) {
        for (const p of pts) {
          const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (d > 220) continue;
          ctx.strokeStyle = `rgba(255,74,53,${(1 - d / 220) * 0.65})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
      }
      const max = Math.min(w, h) * 0.22;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i]!, b = pts[j]!;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > max) continue;
          const o = (1 - d / max) * 0.22;
          ctx.strokeStyle = `rgba(177,75,255,${o})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          // a block "propagating" along the edge
          const f = (t * 0.25 + a.p + b.p) % 1;
          if ((i + j) % 5 === 0) {
            ctx.fillStyle = `rgba(255,90,60,${o * 3})`;
            ctx.fillRect(a.x + (b.x - a.x) * f - 1.5, a.y + (b.y - a.y) * f - 1.5, 3, 3);
          }
        }
      }
      for (const p of pts) {
        const s = 2 + Math.sin(t * 1.5 + p.p) * 0.8;
        ctx.strokeStyle = "rgba(255,120,90,.55)"; ctx.lineWidth = 1;
        ctx.strokeRect(p.x - s * 1.6, p.y - s * 1.6, s * 3.2, s * 3.2);
      }
    };

    const drawConstellation = (t: number) => {
      // faint hex grid
      const R = 46, hx = R * Math.sqrt(3);
      ctx.strokeStyle = "rgba(255,255,255,.035)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let row = -1; row * R * 1.5 < h + R; row++) {
        for (let col = -1; col * hx < w + hx; col++) {
          const x = col * hx + (row % 2 ? hx / 2 : 0), y = row * R * 1.5;
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k + Math.PI / 6;
            const X = x + R * Math.cos(a), Y = y + R * Math.sin(a);
            if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          }
          ctx.closePath();
        }
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      for (const s of stars) {
        const x = s.x * w - par.x * 70 * s.z;
        const y = ((s.y + t * 0.004 * (0.3 + s.z)) % 1) * h - par.y * 50 * s.z;
        const near = mouse.on ? Math.exp(-((x - mouse.x) ** 2 + (y - mouse.y) ** 2) / (2 * 120 * 120)) : 0;
        const tw = Math.min(1, 0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + s.p)) + near);
        const size = (0.6 + s.z * 1.8) * (1 + near * 1.6);
        ctx.fillStyle = s.z > 0.82 ? `rgba(255,90,60,${tw})` : s.z > 0.65 ? `rgba(177,75,255,${tw * 0.8})` : `rgba(255,255,255,${tw * 0.6})`;
        ctx.beginPath(); ctx.arc(x, y, size, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (now: number) => {
      const t = now / 1000;
      const dt = last ? Math.min(0.05, t - last) : 0;
      if (!reduced && dt && dt < 1 / 40) { raf = requestAnimationFrame(frame); return; } // ~30 fps is plenty for a backdrop
      last = t;
      if (mouse.fresh) { mouse.x = mouse.tx; mouse.y = mouse.ty; mouse.fresh = false; }
      mouse.x += (mouse.tx - mouse.x) * 0.14; mouse.y += (mouse.ty - mouse.y) * 0.14;
      const tp = mouse.on ? { x: mouse.x / w - 0.5, y: mouse.y / h - 0.5 } : { x: 0, y: 0 };
      par = { x: par.x + (tp.x - par.x) * 0.06, y: par.y + (tp.y - par.y) * 0.06 };
      ctx.clearRect(0, 0, w, h);
      if (scene === "ribbons") drawRibbons(t);
      else if (scene === "orbits") drawOrbits(t);
      else if (scene === "network") drawNetwork(t, dt);
      else drawConstellation(t);
      if (mouse.on) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 300);
        g.addColorStop(0, "rgba(255,59,47,.13)"); g.addColorStop(0.45, "rgba(177,75,255,.05)"); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(mouse.x - 300, mouse.y - 300, 600, 600);
        ctx.globalCompositeOperation = "source-over";
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) { last = 0; raf = requestAnimationFrame(frame); }
    };
    const onResize = () => { resize(); if (reduced) frame(performance.now()); };
    // Cursor tracking for the backdrop, plus spotlight + tilt on glass cards. Mouse/pen only: touch has no hover.
    let card: HTMLElement | null = null;
    const CARDS = ".specimen, .index-panel, .stat, .sheet, .table-wrap, .strip > div";
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || reduced) return;
      if (!mouse.on) mouse.fresh = true;
      mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.on = true;
      const el = (e.target as Element | null)?.closest?.(CARDS) as HTMLElement | null;
      if (card && card !== el) { card.style.removeProperty("--rx"); card.style.removeProperty("--ry"); }
      card = el;
      if (!el) return;
      const b = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - b.left}px`);
      el.style.setProperty("--my", `${e.clientY - b.top}px`);
      if (el.classList.contains("specimen")) {
        const { rx, ry } = cardTilt((e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height, 6);
        el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
        el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      }
    };
    const onLeave = (e: PointerEvent) => { if (!e.relatedTarget) mouse.on = false; };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
    };
  }, [scene]);

  return (
    <div className={`backdrop backdrop-${scene}`} aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
