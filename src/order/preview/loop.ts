/*
 * Looping previews: a small canvas that plays a scripted, seamless loop drawn from real game sprites.
 *
 * USAGE (any step can use this)
 *
 *   import { loopPreview, type LoopScene } from "../preview/loop";
 *
 *   const wave: LoopScene = {
 *     id: "extras-talk",              // one clock per id: re-rendering the step does not restart the loop
 *     width: 360, height: 240,         // logical drawing size; the canvas is sized to the element × DPR
 *     duration: 4,                     // seconds; draw(t) must look the same at t = 0 and t = duration
 *     images: { face: "order-assets/extras_talk_open.webp" },
 *     draw(g, t, img) { g.drawImage(img.face, 0, 0, 360, 240); },
 *   };
 *   card.append(loopPreview(wave, { poster: "order-assets/extras_talk_rest.webp", label: "Talking face" }));
 *
 * The returned <span class="loop-preview"> fills its parent (position it, give it a size or an aspect-ratio).
 * The poster shows until the images have loaded and the first frame is drawn, and whenever the loop is not
 * playing. Images are only fetched once the element first comes near the screen.
 *
 * PLAYBACK RULES
 *  - Autoplays muted when on screen (IntersectionObserver), pauses when off screen or when the tab is hidden.
 *    Hover-to-play was rejected as the DEFAULT: phones have no hover, and a grid of stills reads as dead.
 *  - `onHover` asks for it anyway, for a grid where every card would otherwise be drawing at once (the twelve
 *    party minigames). It reuses the reduced-motion path below whole, which is what makes it work on a phone:
 *    a tap plays one loop. Owner, 20 Sep 2026.
 *  - prefers-reduced-motion: shows the poster and plays only while the pointer is over it or its card has
 *    keyboard focus, or for one loop after a tap. Pass `hoverTarget` if the interactive card is not the parent.
 *  - One shared requestAnimationFrame drives every visible preview; nothing runs when none are visible.
 */

import "./loop.css";

export type LoopImages = Record<string, HTMLImageElement>;

export interface LoopScene {
  /** Stable id: previews with the same id share a clock, so a re-render continues where it was. */
  id: string;
  width: number;
  height: number;
  /** Loop length in seconds. */
  duration: number;
  /** key -> URL. Loaded lazily; `draw` is only called once all have loaded. */
  images: Record<string, string>;
  /** Draw frame at time t (0 <= t < duration) in logical units. The canvas is cleared before each call. */
  draw(g: CanvasRenderingContext2D, t: number, img: LoopImages): void;
}

export interface LoopPreviewOptions {
  /** Still shown before load, when paused, and under reduced motion. */
  poster?: string;
  /** Accessible description of what the loop shows. */
  label?: string;
  /** Element whose hover/focus plays the loop under reduced motion. Defaults to the closest button/a/label. */
  hoverTarget?: HTMLElement;
  /** Play only while hovered, focused, or for one loop after a tap — whatever the visitor's motion setting. */
  onHover?: boolean;
}

interface Instance {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  scene: LoopScene;
  images?: LoopImages;
  loading?: boolean;
  visible: boolean;
  /** This preview waits to be asked, the way every preview does under reduced motion. */
  onHover: boolean;
  wanted: boolean; // reduced motion, or onHover: hovered / focused / tapped
  drawn: boolean;
  /** Has been in the document; only then can leaving it mean it was thrown away. */
  attached: boolean;
}

const clocks = new Map<string, number>(); // scene id -> seconds played
const tapUntil = new Map<string, number>(); // reduced motion: scene id -> performance.now() it may play until
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const instances = new Set<Instance>();
let raf = 0;
let last = 0;
let observer: IntersectionObserver | null = null;
const reduced = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

function loadImage(url: string): Promise<HTMLImageElement> {
  let p = imageCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error(`preview image failed: ${url}`));
      im.src = url;
    });
    imageCache.set(url, p);
  }
  return p;
}

function shouldPlay(i: Instance): boolean {
  if (!i.visible || !i.images || document.hidden) return false;
  if (!reduced?.matches && !i.onHover) return true;
  return i.wanted || (tapUntil.get(i.scene.id) ?? 0) > performance.now();
}

function sizeCanvas(i: Instance): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = i.host.clientWidth || i.scene.width;
  const scale = Math.max(1, Math.min(2, (w * dpr) / i.scene.width));
  const bw = Math.round(i.scene.width * scale);
  const bh = Math.round(i.scene.height * scale);
  if (i.canvas.width !== bw || i.canvas.height !== bh) {
    i.canvas.width = bw;
    i.canvas.height = bh;
  }
}

function render(i: Instance): void {
  if (!i.images) return;
  sizeCanvas(i);
  const { g, scene } = i;
  const t = (clocks.get(scene.id) ?? 0) % scene.duration;
  g.setTransform(i.canvas.width / scene.width, 0, 0, i.canvas.height / scene.height, 0, 0);
  g.clearRect(0, 0, scene.width, scene.height);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.save();
  scene.draw(g, t, i.images);
  g.restore();
  if (!i.drawn) {
    i.drawn = true;
    i.host.classList.add("ready");
  }
}

function sweep(): void {
  for (const i of instances) {
    if (i.host.isConnected) i.attached = true;
    else if (i.attached) {
      instances.delete(i);
      observer?.unobserve(i.host);
    }
  }
}

function update(): void {
  let any = false;
  for (const i of instances) {
    const play = shouldPlay(i);
    i.host.classList.toggle("playing", play);
    any ||= play;
  }
  if (any && !raf) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
}

function tick(now: number): void {
  raf = 0;
  sweep();
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  const advanced = new Set<string>();
  let any = false;
  for (const i of instances) {
    const play = shouldPlay(i);
    i.host.classList.toggle("playing", play);
    if (!play) continue;
    any = true;
    if (!advanced.has(i.scene.id)) {
      advanced.add(i.scene.id);
      clocks.set(i.scene.id, ((clocks.get(i.scene.id) ?? 0) + dt) % i.scene.duration);
    }
    render(i);
  }
  if (any) raf = requestAnimationFrame(tick);
}

function ensureImages(i: Instance): void {
  if (i.images || i.loading) return;
  i.loading = true;
  const entries = Object.entries(i.scene.images);
  Promise.all(entries.map(([, url]) => loadImage(url)))
    .then(list => {
      const out: LoopImages = {};
      entries.forEach(([k], n) => (out[k] = list[n]));
      i.images = out;
      render(i); // CSS keeps the poster on top under reduced motion until it plays
      update();
    })
    .catch(() => {
      i.host.classList.add("failed"); // the poster stays; nothing else to do
    });
}

function getObserver(): IntersectionObserver | null {
  if (observer || typeof IntersectionObserver === "undefined") return observer;
  observer = new IntersectionObserver(entries => {
    for (const e of entries) {
      for (const i of instances) {
        if (i.host !== e.target) continue;
        i.attached ||= i.host.isConnected;
        i.visible = e.isIntersecting;
        if (i.visible) ensureImages(i);
      }
    }
    update();
  }, { rootMargin: "120px 0px" });
  document.addEventListener("visibilitychange", () => {
    last = performance.now();
    update();
  });
  reduced?.addEventListener?.("change", update);
  return observer;
}

/** A looping canvas preview with a poster fallback. See the file header for usage and playback rules. */
export function loopPreview(scene: LoopScene, opts: LoopPreviewOptions = {}): HTMLElement {
  const host = document.createElement("span");
  host.className = "loop-preview";
  if (opts.poster) host.style.backgroundImage = `url(${opts.poster})`;
  host.setAttribute("role", "img");
  host.setAttribute("aria-label", opts.label ?? "Game preview");
  const canvas = document.createElement("canvas");
  canvas.width = scene.width;
  canvas.height = scene.height;
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  const g = canvas.getContext("2d");
  if (!g) return host; // no canvas: the poster is the preview

  const inst: Instance = { host, canvas, g, scene, visible: false, onHover: !!opts.onHover, wanted: false, drawn: false, attached: false };
  sweep();
  instances.add(inst);

  // Reduced motion (or onHover): hover, keyboard focus, or a tap (one loop) plays it. Bound once in the DOM.
  queueMicrotask(() => {
    const target = opts.hoverTarget ?? (host.closest("button, a, label") as HTMLElement | null) ?? host;
    const want = (on: boolean) => () => {
      inst.wanted = on;
      if (on) ensureImages(inst);
      update();
    };
    target.addEventListener("pointerenter", want(true));
    target.addEventListener("pointerleave", want(false));
    target.addEventListener("focusin", want(true));
    target.addEventListener("focusout", want(false));
    target.addEventListener("pointerdown", () => {
      tapUntil.set(scene.id, performance.now() + scene.duration * 1000);
      ensureImages(inst);
      update();
    });
  });

  const io = getObserver();
  if (io) io.observe(host);
  else {
    inst.visible = true;
    ensureImages(inst);
  }
  return host;
}
