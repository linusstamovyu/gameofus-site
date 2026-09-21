// Looping previews for the section steps: an adapter onto the shared player in ../preview/loop plus the scenes
// shared by more than one step (slideshows of the game's own plates, a car on its 12-frame bob).
//
// Owner, 2026-09-15: "more videos need to be included instead of dead photos". A clip would cost hundreds of KB
// and there is no ffmpeg here, so a preview is a few of the game's own frames played on a canvas, cut by
// tools/build_order_loops.py (loop_* in public/order-assets).
//
// Playback (on screen only, one shared clock per id, poster under reduced motion, pauses in a hidden tab) is
// ../preview/loop's, the Games step's player; nothing here duplicates it. What this adds is the section steps'
// scene shape: `img(url)` lookups rather than keyed records, a pixel-art flag, and a box to put it in.

import "./loops.css";
import { loopPreview, type LoopScene } from "../preview/loop";
import { orderAsset } from "../catalogue";

export type ImageGetter = (url: string) => HTMLImageElement | null;

export interface Scene {
  /** Stable id: a re-rendered step carries on from where the loop was. */
  id: string;
  /** Logical drawing size. */
  w: number;
  h: number;
  /** Loop length in seconds; draw(t) must match at 0 and `duration`. */
  duration: number;
  /** Every image the scene draws. */
  images: string[];
  /** Still shown before the images load and under reduced motion. */
  poster: string;
  /** Nearest-neighbour scaling, for pixel art. */
  pixelated?: boolean;
  /** Accessible description of what the loop shows. */
  label: string;
  draw(g: CanvasRenderingContext2D, t: number, img: ImageGetter): void;
}

/**
 * A box of the scene's own aspect that plays it. `cls` is added to the box, so a card's `art` class keeps the
 * card's shape; pass `hoverTarget` when the interactive element is not an ancestor, and `onHover` for a grid
 * where the loops should wait to be asked rather than all play at once.
 */
export function loopBox(scene: Scene, cls = "", hoverTarget?: HTMLElement, onHover = false): HTMLElement {
  const box = document.createElement("span");
  box.className = `loop-box ${cls}`.trim();
  box.style.aspectRatio = `${scene.w} / ${scene.h}`;
  const adapted: LoopScene = {
    id: scene.id,
    width: scene.w,
    height: scene.h,
    duration: scene.duration,
    images: Object.fromEntries(scene.images.map(u => [u, u])),
    draw(g, t, imgs) {
      g.imageSmoothingEnabled = !scene.pixelated;
      scene.draw(g, t, url => imgs[url] ?? null);
    },
  };
  box.append(loopPreview(adapted, { poster: scene.poster, label: scene.label, hoverTarget, onHover }));
  return box;
}

// ---------------------------------------------------------------- drawing helpers

/** Draw `im` covering the box, zoomed by `zoom` about a point that drifts by (px, py) in -1..1. */
export function drawCover(g: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number, zoom = 1, px = 0, py = 0): void {
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  g.drawImage(im, x + (w - dw) / 2 + ((dw - w) / 2) * px, y + (h - dh) / 2 + ((dh - h) / 2) * py, dw, dh);
}

/** One cell of a horizontal strip, centred on (cx, cy), `h` tall. `cells` defaults to square cells. */
export function drawCell(g: CanvasRenderingContext2D, im: HTMLImageElement, index: number, cx: number, cy: number, h: number, cells?: number): void {
  const n = cells ?? Math.max(1, Math.round(im.naturalWidth / im.naturalHeight));
  const cw = im.naturalWidth / n;
  const i = Math.max(0, Math.min(n - 1, Math.floor(index)));
  const w = h * (cw / im.naturalHeight);
  g.drawImage(im, i * cw, 0, cw, im.naturalHeight, cx - w / 2, cy - h / 2, w, h);
}

/** Frame index `q` (0..1) through a strip of `n` frames. */
export const frameAt = (q: number, n: number) => Math.min(n - 1, Math.floor(Math.max(0, q) * n));

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (v: number) => { const q = clamp01(v); return q * q * (3 - 2 * q); };

/**
 * Text as it should be drawn in the pixel font. Pixelify Sans has an "fi"/"fl" ligature that a canvas applies and
 * cannot switch off, and at caption sizes it reads as a capital A: "final form" came out as "Anal form". A zero-width
 * non-joiner between the pair stops the ligature and draws nothing.
 */
export const noLigatures = (text: string) => text.replace(/f(?=[filt])/g, "f\u200C");

/** Rounded pill with text, for captions drawn inside a loop. */
export function pill(g: CanvasRenderingContext2D, text: string, x: number, y: number, opts: { bg?: string; fg?: string; size?: number; align?: "left" | "center" } = {}): void {
  text = noLigatures(text);
  const size = opts.size ?? 13;
  // The UI face, as the Games step's captions use: at this size the pixel font's "c" reads as an "o".
  g.font = `700 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  const w = g.measureText(text).width + size * 1.1;
  const h = size * 1.7;
  const left = opts.align === "center" ? x - w / 2 : x;
  g.fillStyle = opts.bg ?? "rgba(23,34,46,.82)";
  g.beginPath();
  g.roundRect(left, y, w, h, h / 2);
  g.fill();
  g.fillStyle = opts.fg ?? "#fdf6e3";
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.fillText(text, left + w / 2, y + h / 2 + 1);
  g.textAlign = "left";
}

// ---------------------------------------------------------------- shared scenes

export interface SlideStep { file: string; hold: number }

/**
 * The game's own plates played in order. `fade` 0 is a hard cut (right for plates of one man in one place,
 * where a crossfade only softens the part that moved); otherwise a crossfade with a slow push-in.
 */
export function slideshow(id: string, steps: SlideStep[], label: string, opts: { fade?: number; push?: boolean; trailer?: boolean; w?: number; h?: number } = {}): Scene {
  const urls = steps.map(s => orderAsset(s.file));
  const total = steps.reduce((a, s) => a + s.hold, 0);
  const fade = opts.fade ?? 0;
  const W = opts.w ?? 360, H = opts.h ?? 240;
  return {
    id, w: W, h: H, duration: total, images: urls, poster: urls[0], label,
    draw(g, t, img) {
      g.fillStyle = "#223242";
      g.fillRect(0, 0, W, H);
      let local = t % total;
      let i = 0;
      while (local >= steps[i].hold) { local -= steps[i].hold; i++; }
      const plate = (k: number, lt: number, alpha: number) => {
        const im = img(urls[k % urls.length]);
        if (!im) return;
        g.globalAlpha = alpha;
        const q = lt / steps[k % steps.length].hold;
        if (opts.push) drawCover(g, im, 0, 0, W, H, 1.02 + 0.08 * q, k % 2 ? -0.6 + q : 0.6 - q, -0.2);
        else drawCover(g, im, 0, 0, W, H);
        g.globalAlpha = 1;
      };
      plate(i, local, 1);
      if (fade > 0 && local > steps[i].hold - fade) plate(i + 1, local - steps[i].hold, (local - (steps[i].hold - fade)) / fade);
      if (opts.trailer) {
        g.fillStyle = "#000";
        g.fillRect(0, 0, W, 18);
        g.fillRect(0, H - 18, W, 18);
        g.fillStyle = "rgba(255,255,255,.28)";
        g.fillRect(12, H - 11, W - 24, 3);
        g.fillStyle = "#f1cf9a";
        g.fillRect(12, H - 11, (W - 24) * ((t % total) / total), 3);
        pill(g, "▶ TRAILER", 10, 24, { size: 11 });
      }
    },
  };
}

/** A car (or taxi) driving right on its own 12-frame suspension bob, over a scrolling road. */
export function carScene(id: string, file: string, poster: string, label: string): Scene {
  const url = orderAsset(file);
  return {
    id, w: 360, h: 240, duration: 1, images: [url], poster: orderAsset(poster), pixelated: true, label,
    draw(g, t, img) {
      const scroll = (t * 180) % 60;
      g.fillStyle = "#e8d8ad"; // pavement
      g.fillRect(0, 0, 360, 240);
      g.fillStyle = "#d9c79a";
      for (let x = -scroll; x < 360; x += 30) { g.fillRect(x, 0, 2, 58); g.fillRect(x, 182, 2, 58); }
      g.fillStyle = "#b9ab86";
      g.fillRect(0, 56, 360, 6);
      g.fillRect(0, 178, 360, 6);
      g.fillStyle = "#4a4f57"; // road
      g.fillRect(0, 62, 360, 116);
      g.fillStyle = "#f3e6b8";
      for (let x = -scroll; x < 360; x += 60) g.fillRect(x, 118, 32, 4);
      const im = img(url);
      if (im) drawCell(g, im, Math.floor(t * 12) % 12, 180, 114, 216, 12); // a card may crop this square, so the car stays inside the middle 240
    },
  };
}
