// Pure timeline and geometry for the site's motion: the eclipse intro and the backdrop ribbons.
// Kept free of DOM so the maths can be tested in Node and the components only draw.

export const INTRO_SECONDS = 4;
/** The choreography below is written on a 3-second clock and stretched evenly to INTRO_SECONDS. */
const DESIGN_SECONDS = 3;
export const INTRO_WORD = "RED LIST";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));

export function shouldPlayIntro({ seenThisSession, reducedMotion }: { seenThisSession: boolean; reducedMotion: boolean }) {
  return !seenThisSession && !reducedMotion;
}

export type LetterState = { opacity: number; blur: number; scale: number; dx: number; dy: number };
export type IntroFrame = {
  /** 0..1 fade of the rim and planet. */
  rimOpacity: number;
  /** Rim radius as a fraction of the viewport width. */
  radius: number;
  /** Lowest point of the rim as a fraction of viewport height. */
  bottom: number;
  /** Half-angle (radians) of the visible rim around its lowest point; PI is the full circle. */
  span: number;
  /** Brightness flash when the rim "lands". */
  pulse: number;
  /** 0..1 progress of the glint travelling along the rim. */
  glint: number;
  letters: LetterState[];
  uiOpacity: number;
};

const LETTERS = [...INTRO_WORD].filter((c) => c !== " ");

export function introFrame(rawT: number): IntroFrame {
  const t = clamp(rawT, 0, INTRO_SECONDS) * (DESIGN_SECONDS / INTRO_SECONDS);
  const grow = easeInOut(seg(t, 0.45, 1.75));
  const letters = LETTERS.map((_, i) => {
    const k = Math.abs(i - 2.5) - 0.5; // land from the centre out: R E D L I S T -> 2 1 0 0 1 2 3
    const x = easeExpo(seg(t, 0.95 + k * 0.12, 1.75 + k * 0.12));
    const end = t >= 1.75 + k * 0.12;
    return {
      opacity: end ? 1 : clamp(x * 1.6),
      blur: end ? 0 : (1 - x) * 22,
      scale: end ? 1 : lerp(2.6, 1, x),
      dx: end ? 0 : (1 - x) * (i - 3) * 60,
      dy: end ? 0 : (1 - x) * -30,
    };
  });
  return {
    rimOpacity: easeOut(seg(t, 0, 0.45)),
    radius: lerp(0.156, 0.6, grow),
    bottom: lerp(0.555, 0.593, grow),
    span: lerp(0.5, Math.PI, easeInOut(seg(t, 0.55, 1.75))),
    pulse: 1 + 0.6 * Math.exp(-Math.pow((t - 1.0) / 0.16, 2)),
    glint: seg(t, 1.55, 2.8),
    letters,
    uiOpacity: easeOut(seg(t, 1.9, 2.5)),
  };
}

/**
 * y-position of one strand of a flowing light ribbon.
 * ribbon: which ribbon (0..2), strand: which thread inside it, x: canvas x, t: seconds, w/h: canvas size.
 * Strands fan out and cross over as the "spread" term changes sign, which gives the twisting-silk look.
 */
export function ribbonPoint(ribbon: number, strand: number, x: number, t: number, w: number, h: number) {
  const u = x / w;
  const base = h * (0.5 + ribbon * 0.07) - (u - 0.5) * h * 0.5;
  const wave = Math.sin(u * 3.6 + t * 0.35 + ribbon * 1.7) * h * 0.12 + Math.sin(u * 8.3 - t * 0.22 + ribbon) * h * 0.04;
  const spread = Math.sin(u * 2.7 + t * 0.18 + ribbon * 2.3) * (3.4 + ribbon * 0.9);
  return base + wave + (strand - 14) * spread;
}

/**
 * How far the cursor pushes a point of the backdrop: a soft Gaussian bump, strongest under the cursor,
 * pointing away from it, never more than `strength` pixels, and exactly zero beyond three radii.
 */
export function cursorPush(x: number, y: number, mx: number, my: number, radius: number, strength: number) {
  const ox = x - mx, oy = y - my;
  const d = Math.hypot(ox, oy);
  if (d > radius * 3) return { dx: 0, dy: 0 };
  const f = strength * Math.exp(-(d * d) / (2 * radius * radius));
  if (d < 1e-6) return { dx: 0, dy: -f };
  return { dx: (ox / d) * f, dy: (oy / d) * f };
}

/** 3D tilt (degrees) of a card toward the cursor; px/py are the cursor's position inside the card, 0..1. */
export function cardTilt(px: number, py: number, max: number) {
  return { rx: (0.5 - clamp(py)) * 2 * max, ry: (clamp(px) - 0.5) * 2 * max };
}
