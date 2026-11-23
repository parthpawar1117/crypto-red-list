import { describe, expect, it } from "vitest";
import { INTRO_SECONDS, cardTilt, cursorPush, introFrame, ribbonPoint, shouldPlayIntro } from "@/web/motion";

describe("shouldPlayIntro", () => {
  it("plays on the first visit of a session", () => {
    expect(shouldPlayIntro({ seenThisSession: false, reducedMotion: false })).toBe(true);
  });
  it("does not replay within the same session", () => {
    expect(shouldPlayIntro({ seenThisSession: true, reducedMotion: false })).toBe(false);
  });
  it("never plays for people who asked for reduced motion", () => {
    expect(shouldPlayIntro({ seenThisSession: false, reducedMotion: true })).toBe(false);
  });
});

describe("introFrame", () => {
  it("lasts four seconds, with the same choreography stretched evenly", () => {
    expect(INTRO_SECONDS).toBe(4);
    // The last letter (T) used to land at 2.11 s; stretched by 4/3 it lands at about 2.81 s.
    expect(introFrame(2.3).letters.at(-1)!.blur).toBeGreaterThan(0.05); // still landing
    expect(introFrame(2.9).letters.at(-1)!.blur).toBe(0); // landed
  });
  it("starts dark: no rim, no letters, no UI", () => {
    const f = introFrame(0);
    expect(f.rimOpacity).toBe(0);
    expect(f.letters.every((l) => l.opacity === 0)).toBe(true);
    expect(f.uiOpacity).toBe(0);
  });
  it("starts as a thin smile and ends as a full eclipse rim", () => {
    expect(introFrame(0.5).span).toBeLessThan(0.6);
    expect(introFrame(INTRO_SECONDS).span).toBeCloseTo(Math.PI, 5);
    expect(introFrame(INTRO_SECONDS).radius).toBeGreaterThan(introFrame(0.5).radius * 3);
  });
  it("lands every letter sharp and in place by the end", () => {
    for (const l of introFrame(INTRO_SECONDS).letters) {
      expect(l.opacity).toBe(1);
      expect(l.blur).toBeCloseTo(0, 3);
      expect(l.scale).toBeCloseTo(1, 3);
    }
  });
  it("has one letter state per letter of RED LIST", () => {
    expect(introFrame(1).letters).toHaveLength(7);
  });
  it("clamps times outside the timeline", () => {
    expect(introFrame(-5)).toEqual(introFrame(0));
    expect(introFrame(99)).toEqual(introFrame(INTRO_SECONDS));
  });
});

describe("ribbonPoint", () => {
  it("is deterministic for the same inputs", () => {
    expect(ribbonPoint(0, 3, 400, 1.2, 1440, 800)).toEqual(ribbonPoint(0, 3, 400, 1.2, 1440, 800));
  });
  it("moves over time", () => {
    expect(ribbonPoint(0, 3, 400, 0, 1440, 800)).not.toBe(ribbonPoint(0, 3, 400, 2, 1440, 800));
  });
  it("stays within a sane band around the canvas", () => {
    for (let x = 0; x <= 1440; x += 60) {
      for (const t of [0, 5, 50]) {
        const y = ribbonPoint(1, 10, x, t, 1440, 800);
        expect(y).toBeGreaterThan(-800);
        expect(y).toBeLessThan(1600);
      }
    }
  });
});

describe("cursorPush", () => {
  it("does nothing far from the cursor", () => {
    expect(cursorPush(0, 0, 900, 900, 160, 60)).toEqual({ dx: 0, dy: 0 });
  });
  it("pushes a point away from the cursor, hardest close by", () => {
    const near = cursorPush(110, 100, 100, 100, 160, 60);
    const far = cursorPush(250, 100, 100, 100, 160, 60);
    expect(near.dx).toBeGreaterThan(far.dx);
    expect(far.dx).toBeGreaterThan(0);
    expect(cursorPush(100, 140, 100, 100, 160, 60).dy).toBeGreaterThan(0);
    expect(cursorPush(100, 60, 100, 100, 160, 60).dy).toBeLessThan(0);
  });
  it("never pushes further than the strength", () => {
    for (let d = 0; d < 400; d += 7) {
      const p = cursorPush(100 + d, 100, 100, 100, 160, 60);
      expect(Math.hypot(p.dx, p.dy)).toBeLessThanOrEqual(60);
    }
  });
  it("is safe exactly on the cursor", () => {
    const p = cursorPush(100, 100, 100, 100, 160, 60);
    expect(Number.isFinite(p.dx) && Number.isFinite(p.dy)).toBe(true);
  });
});

describe("cardTilt", () => {
  it("is flat at the centre and leans toward the cursor at the edges, within the limit", () => {
    expect(cardTilt(0.5, 0.5, 6)).toEqual({ rx: 0, ry: 0 });
    const right = cardTilt(1, 0.5, 6);
    expect(right.ry).toBe(6);
    const top = cardTilt(0.5, 0, 6);
    expect(top.rx).toBe(6);
    expect(Math.abs(cardTilt(-3, 9, 6).rx)).toBeLessThanOrEqual(6);
  });
});
