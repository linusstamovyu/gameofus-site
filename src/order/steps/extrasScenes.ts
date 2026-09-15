// The Extras step's looping previews: a talking face, an evolution, catching a lad with a drink, a signature
// move and two ways to play together. Each is a Scene for ./loops (on screen only, still for reduced motion).
// Every picture is the game's own art, cut by tools/build_order_loops.py.

import { asset } from "../../dom";
import { orderAsset } from "../catalogue";
import { clamp01, drawCell, drawCover, frameAt, noLigatures, pill, smooth, type ImageGetter, type Scene } from "./loops";

const PAPER = "#fdf6e3";
const INK = "#20242c";
const NIGHT = "#223242";
const FONT = (px: number, weight = 700) => `${weight} ${px}px "Pixelify Sans", "Courier New", monospace`;

// ---------------------------------------------------------------- talking face

/**
 * Chris's load-in mouth track as the game measures it (polishedcrystal-master src/data/speechTimelines.ts,
 * the owner's hand-checked table): one character per 50 ms, "c" closed, "o" open, "i" back to idle.
 */
const CHRIS_MOUTH = "c".repeat(12) + "o".repeat(4) + "c".repeat(13) + "o".repeat(4) + "c" + "o".repeat(3) +
  "c".repeat(18) + "o".repeat(9) + "cc" + "oo" + "cccc" + "i".repeat(17);
const MOUTH_FPS = 20;
const TALK_LINE = "Right lads, who's buying the first round?";

export function talkScene(): Scene {
  const rest = orderAsset("loop_talk_rest.png");
  const open = orderAsset("loop_talk_open.png");
  const speech = CHRIS_MOUTH.length / MOUTH_FPS;
  const HOLD_BEFORE = 1.4;
  const total = speech + HOLD_BEFORE;
  return {
    id: "extras-talk", w: 360, h: 240, duration: total, images: [rest, open], poster: orderAsset("loop_poster_talk.webp"), pixelated: true,
    label: "A character's face in the game, his mouth moving as he says his line.",
    draw(g, t, img) {
      // The loop opens on the finished line (so a paused frame reads), then he says it again.
      const lt = (t % total) - HOLD_BEFORE;
      g.fillStyle = "#f6ecd4";
      g.fillRect(0, 0, 360, 240);
      // a soft spotlight behind the head
      const glow = g.createRadialGradient(96, 140, 10, 96, 140, 130);
      glow.addColorStop(0, "#fff8e6");
      glow.addColorStop(1, "#f6ecd4");
      g.fillStyle = glow;
      g.fillRect(0, 0, 360, 240);
      const slot = Math.floor(lt * MOUTH_FPS + 1e-6);
      const state = slot >= 0 && slot < CHRIS_MOUTH.length ? CHRIS_MOUTH[slot] : "i";
      const im = img(state === "o" ? open : rest) ?? img(rest);
      if (im) g.drawImage(im, -4, 44, 200, 200); // 120px plate drawn at 1.67x: a head, not a figure
      // speech bubble
      const typed = lt < 0 ? 1 : clamp01(lt / (speech * 0.72));
      const shown = Math.round(TALK_LINE.length * typed);
      g.fillStyle = PAPER;
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(204, 34, 146, 108, 10);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(206, 124); g.lineTo(184, 142); g.lineTo(206, 104);
      g.fillStyle = PAPER;
      g.fill();
      g.beginPath();
      g.moveTo(204, 125); g.lineTo(184, 142); g.lineTo(204, 103);
      g.stroke();
      g.fillStyle = INK;
      g.font = FONT(16);
      g.textBaseline = "top";
      wrapText(g, TALK_LINE, shown, 216, 46, 124, 21);
      // voice bars while he is actually talking
      const talking = lt >= 0 && state !== "i";
      for (let i = 0; i < 5; i++) {
        const hgt = talking ? 4 + Math.abs(Math.sin(lt * 14 + i * 1.7)) * (state === "o" ? 20 : 8) : 3;
        g.fillStyle = "#1a9e95";
        g.fillRect(250 + i * 10, 196 - hgt, 6, hgt);
      }
    },
  };
}

/** Wraps the WHOLE text first and then shows its first `shown` characters, so a word being typed never jumps
 *  to the next line halfway through. */
function wrapText(g: CanvasRenderingContext2D, text: string, shown: number, x: number, y: number, max: number, lh: number): void {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > max && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  let left = shown;
  lines.forEach((l, row) => {
    if (left <= 0) return;
    g.fillText(noLigatures(l.slice(0, left)), x, y + row * lh);
    left -= l.length + 1;
  });
}

// ---------------------------------------------------------------- evolution

const silhouettes = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
function silhouette(im: HTMLImageElement): HTMLCanvasElement {
  let c = silhouettes.get(im);
  if (!c) {
    c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext("2d")!;
    x.drawImage(im, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    silhouettes.set(im, c);
  }
  return c;
}

const EVO_HOLD = 1.2;   // look at the form you have
const EVO_MORPH = 1.6;  // the two silhouettes flicker, faster and faster
const EVO_FLASH = 0.22; // white out
const EVO_REVEAL = 1.5; // the new form, still glowing
const EVO_STAGE = EVO_HOLD + EVO_MORPH + EVO_FLASH + EVO_REVEAL;
const EVO_NAMES = ["Rico", "Rico · evolved", "Rico · final form"];

export function evolutionScene(): Scene {
  const urls = [1, 2, 3].map(i => orderAsset(`loop_evo_${i}.webp`));
  const total = EVO_STAGE * 2 + EVO_HOLD + 0.6;
  const backdrop = (g: CanvasRenderingContext2D, lift: number) => {
    const bg = g.createRadialGradient(180, 120, 20, 180, 120, 230);
    bg.addColorStop(0, `rgb(${60 + 140 * lift},${86 + 120 * lift},${110 + 100 * lift})`);
    bg.addColorStop(1, NIGHT);
    g.fillStyle = bg;
    g.fillRect(0, 0, 360, 240);
  };
  const body = (g: CanvasRenderingContext2D, im: HTMLImageElement | null, opts: { white?: number; scale?: number; alpha?: number } = {}) => {
    if (!im) return;
    const size = 218 * (opts.scale ?? 1);
    const x = 180 - size / 2, y = 240 - size + (size - 206) * 0.5; // the bust sits on the frame's bottom edge
    g.globalAlpha = opts.alpha ?? 1;
    g.drawImage(im, x, y, size, size);
    if (opts.white) { g.globalAlpha = (opts.alpha ?? 1) * opts.white; g.drawImage(silhouette(im), x, y, size, size); }
    g.globalAlpha = 1;
  };
  const rays = (g: CanvasRenderingContext2D, q: number) => {
    const a = 1 - q;
    if (a <= 0) return;
    g.save();
    g.translate(180, 130);
    g.globalAlpha = a * 0.8;
    g.fillStyle = "#ffe9a8";
    for (let i = 0; i < 14; i++) {
      g.rotate((Math.PI * 2) / 14);
      const r0 = 40 + 120 * q, r1 = r0 + 26;
      g.fillRect(r0, -2, r1 - r0, 4);
    }
    g.restore();
    g.globalAlpha = 1;
  };
  return {
    id: "extras-evolution", w: 360, h: 240, duration: total, images: urls, poster: orderAsset("loop_poster_evo.webp"), label: "A character transforming into his evolved forms: Rico, then half eagle, then a golden eagle.",
    draw(g, t, img) {
      const lt = t % total;
      const stage = Math.min(2, Math.floor(lt / EVO_STAGE));
      const from = img(urls[stage]);
      if (stage === 2) {
        // final form held, then dissolving back into the first form, which is where the loop starts
        const q = lt - EVO_STAGE * 2;
        const back = smooth((q - EVO_HOLD) / 0.6);
        backdrop(g, 0.15 * (1 - back));
        body(g, from, { alpha: 1 - back });
        body(g, img(urls[0]), { alpha: back });
        pill(g, EVO_NAMES[back > 0.5 ? 0 : 2], 180, 10, { align: "center" });
        return;
      }
      const to = img(urls[stage + 1]);
      const q = lt - stage * EVO_STAGE;
      if (q < EVO_HOLD) {
        backdrop(g, stage ? 0.15 : 0);
        body(g, from, { scale: 1 + Math.sin((q / EVO_HOLD) * Math.PI) * 0.01 });
        pill(g, EVO_NAMES[stage], 180, 10, { align: "center" });
      } else if (q < EVO_HOLD + EVO_MORPH) {
        const u = (q - EVO_HOLD) / EVO_MORPH;
        backdrop(g, 0.25 * u);
        const period = 0.28 - 0.23 * Math.pow(u, 1.4);
        const showTo = Math.floor((q - EVO_HOLD) / period) % 2 === 1;
        // a ring of light closing in
        g.strokeStyle = `rgba(255,236,170,${0.25 + 0.5 * u})`;
        g.lineWidth = 3 + 5 * u;
        g.beginPath();
        g.arc(180, 130, 150 - 60 * u, 0, Math.PI * 2);
        g.stroke();
        body(g, showTo ? to : from, { white: 0.55 + 0.45 * u, scale: 1 + 0.05 * Math.sin(u * 30) * u });
        pill(g, "What's happening?!", 180, 10, { align: "center" });
      } else if (q < EVO_HOLD + EVO_MORPH + EVO_FLASH) {
        const u = (q - EVO_HOLD - EVO_MORPH) / EVO_FLASH;
        backdrop(g, 0.3);
        body(g, to, { white: 1 });
        g.fillStyle = `rgba(255,255,255,${u})`;
        g.fillRect(0, 0, 360, 240);
      } else {
        const u = (q - EVO_HOLD - EVO_MORPH - EVO_FLASH) / EVO_REVEAL;
        backdrop(g, 0.3 * (1 - u) + 0.15);
        rays(g, clamp01(u * 1.6));
        body(g, to, { white: 1 - smooth(u * 2.2), scale: 1.06 - 0.06 * smooth(u * 2) });
        g.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - u * 5)})`;
        g.fillRect(0, 0, 360, 240);
        pill(g, EVO_NAMES[stage + 1], 180, 10, { align: "center", bg: "rgba(26,158,149,.92)" });
      }
    },
  };
}

// ---------------------------------------------------------------- catching a lad with a drink

// The battle's own beat lengths (BattleSceneRenderer CATCH_PHASE_SECONDS), a touch slower to read on a page.
const C = { throw: 0.62, open: 0.34, absorb: 0.62, rest: 0.4, wobble: 0.56, success: 0.7, hold: 1.3, reveal: 0.56, idle: 1.0 };
const WOBBLES = 3;

export function catchScene(): Scene {
  const f = (n: string) => orderAsset(`loop_catch_${n}.webp`);
  const u = { bg: f("bg"), kai: f("kai"), throw: f("throw"), rest: f("rest"), wobble: f("wobble"), open: f("shared_open"), absorb: f("shared_absorb"), success: f("shared_success") };
  const beats: [string, number][] = [["idle", C.idle], ["throw", C.throw], ["open", C.open], ["absorb", C.absorb], ["rest", C.rest]];
  for (let i = 0; i < WOBBLES; i++) beats.push(["wobble", C.wobble]);
  beats.push(["success", C.success], ["hold", C.hold], ["reveal", C.reveal]);
  const total = beats.reduce((a, b) => a + b[1], 0);

  const FEET = 214, KX = 258, KH = 150;
  const centre = { x: KX, y: FEET - KH / 2 };
  const ground = { x: KX, y: FEET - KH * 0.22 };
  const drinkH = KH * 0.55, burstH = KH * 1.1;

  const lad = (g: CanvasRenderingContext2D, img: ImageGetter, scale: number, alpha: number) => {
    const im = img(u.kai);
    if (!im || alpha <= 0) return;
    const h = KH * scale, w = h * (im.naturalWidth / im.naturalHeight);
    g.globalAlpha = alpha;
    g.drawImage(im, KX - w / 2, FEET - h - (1 - scale) * KH * 0.3, w, h);
    g.globalAlpha = 1;
  };
  const hpBar = (g: CanvasRenderingContext2D, alpha: number) => {
    g.globalAlpha = alpha;
    pill(g, "Kai  Lv 7", 206, 12, { size: 11 });
    g.fillStyle = INK;
    g.fillRect(206, 34, 110, 9);
    g.fillStyle = "#e8d8ad";
    g.fillRect(208, 36, 106, 5);
    g.fillStyle = "#d9463b";
    g.fillRect(208, 36, 106 * 0.18, 5);
    g.globalAlpha = 1;
  };

  const scene: Scene = {
    id: "extras-catch", w: 360, h: 240, duration: total, images: Object.values(u), poster: orderAsset("loop_poster_catch.webp"), label: "Catching a lad: a drink is thrown at him, he is pulled into it, it wobbles three times and he joins your squad.",
    draw(g, t, img) {
      let lt = t % total;
      let i = 0;
      while (lt >= beats[i][1]) { lt -= beats[i][1]; i++; }
      const [phase, dur] = beats[i];
      const q = lt / dur;
      const bg = img(u.bg);
      if (bg) drawCover(g, bg, 0, 0, 360, 240); else { g.fillStyle = "#e8d8ad"; g.fillRect(0, 0, 360, 240); }
      g.fillStyle = "rgba(0,0,0,.18)";
      g.beginPath();
      g.ellipse(KX, FEET - 2, 46, 9, 0, 0, Math.PI * 2);
      g.fill();

      const before = ["idle", "throw", "open"].includes(phase);
      if (before) { lad(g, img, 1, 1); hpBar(g, 1); }
      const strip = (key: keyof typeof u, qq: number, x: number, y: number, h: number) => {
        const im = img(u[key]);
        if (!im) return;
        const n = Math.round(im.naturalWidth / im.naturalHeight);
        // The absorb strip's first two cells are cut through by the sheet's own edges; start past them.
        const skip = key === "absorb" ? 2 : 0;
        drawCell(g, im, skip + frameAt(qq, n - skip), x, y, h);
      };
      switch (phase) {
        case "throw": {
          const from = { x: 24, y: 236 };
          const x = from.x + (ground.x - from.x) * q;
          const y = from.y + (ground.y - from.y) * q - Math.sin(q * Math.PI) * 110;
          strip("throw", q, x, y, drinkH);
          pill(g, "Throw a drink", 12, 12, { size: 12 });
          break;
        }
        case "open": strip("open", q, ground.x, ground.y, burstH); break;
        case "absorb": {
          const e = smooth(q);
          lad(g, img, 1 - 0.85 * e, 1 - e);
          hpBar(g, 1 - e);
          strip("absorb", q, centre.x, centre.y, burstH);
          break;
        }
        case "rest": strip("rest", q, ground.x, ground.y, drinkH); break;
        case "wobble": {
          strip("wobble", q, ground.x, ground.y, drinkH);
          const n = beats.slice(0, i + 1).filter(b => b[0] === "wobble").length;
          for (let k = 0; k < WOBBLES; k++) {
            g.fillStyle = k < n ? "#f1cf9a" : "rgba(253,246,227,.7)";
            g.strokeStyle = INK;
            g.lineWidth = 2;
            g.beginPath();
            g.arc(KX - 20 + k * 20, ground.y - drinkH * 0.72, 6, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          }
          break;
        }
        case "success":
          strip("rest", 0, ground.x, ground.y, drinkH);
          strip("success", q, ground.x, ground.y, burstH);
          break;
        case "hold":
          strip("rest", 0, ground.x, ground.y, drinkH);
          caught(g, Math.min(1, q * 4));
          break;
        case "reveal": {
          const e = smooth(q);
          lad(g, img, 0.3 + 0.7 * e, e);
          hpBar(g, e);
          strip("absorb", 1 - q, centre.x, centre.y, burstH);
          break;
        }
      }
    },
  };
  return scene;
}

function caught(g: CanvasRenderingContext2D, a: number): void {
  g.save();
  g.globalAlpha = a;
  g.translate(122, 92);
  const s = 0.7 + 0.3 * a;
  g.scale(s, s);
  g.font = FONT(38);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 7;
  g.strokeStyle = INK;
  g.strokeText("CAUGHT!", 0, 0);
  g.fillStyle = "#f1cf9a";
  g.fillText("CAUGHT!", 0, 0);
  g.restore();
  g.globalAlpha = a;
  pill(g, "Kai joined the squad", 122, 122, { align: "center", bg: "rgba(26,158,149,.92)", size: 13 });
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- signature move

export function moveScene(): Scene {
  const rain = orderAsset("loop_move_rain.webp");
  const total = 16 / 12 + 0.7;
  return {
    id: "extras-move", w: 240, h: 240, duration: total, images: [rain], poster: orderAsset("loop_poster_move.webp"), label: "A signature move's effect playing: cash and coins thrown into the air and raining down.",
    draw(g, t, img) {
      const lt = (t + 0.9) % total; // a paused frame lands mid-shower, not on an empty stage
      const bg = g.createRadialGradient(120, 130, 10, 120, 130, 170);
      bg.addColorStop(0, "#35506a");
      bg.addColorStop(1, NIGHT);
      g.fillStyle = bg;
      g.fillRect(0, 0, 240, 240);
      const im = img(rain);
      if (im && lt < 16 / 12) drawCell(g, im, Math.floor(lt * 12), 120, 120, 236, 16);
      pill(g, "Make It Rain", 120, 206, { align: "center", size: 12 });
    },
  };
}

// ---------------------------------------------------------------- playing together

/** A plate scrolling left forever: every other copy is mirrored, so the join is seamless whatever the plate. */
function panorama(g: CanvasRenderingContext2D, im: HTMLImageElement, x0: number, width: number, drift: number): void {
  const d = drift % 720;
  for (let k = 0; k * 360 - d < width + 360; k++) {
    const x = x0 + k * 360 - d;
    if (x + 360 < x0) continue;
    if (k % 2) {
      g.save();
      g.translate(x + 360, 0);
      g.scale(-1, 1);
      drawCover(g, im, 0, 0, 360, 240);
      g.restore();
    } else drawCover(g, im, x, 0, 360, 240);
  }
}

/** Two lads walking right on their own walk cycles. `online`: each on his own screen, far apart. */
export function togetherScene(online: boolean): Scene {
  const walkers = [asset("rico_walk.webp"), asset("kai_walk.webp")];
  const plates = online ? [asset("bg_beach.webp"), asset("bg_harbour.webp")] : [asset("bg_beach.webp")];
  const walker = (g: CanvasRenderingContext2D, im: HTMLImageElement | null, x: number, feet: number, t: number, name: string, phase: number) => {
    if (!im) return;
    // 9 cells of 64x128: down idle/stepA/stepB, up..., left idle/stepA/stepB. Walking right = the left row mirrored.
    const cells = [6, 7, 6, 8];
    const cell = cells[Math.floor(t * 6 + phase) % 4];
    const cw = im.naturalWidth / 9, ch = im.naturalHeight;
    const h = 96, w = h * (cw / ch);
    g.save();
    g.translate(x, 0);
    g.scale(-1, 1);
    g.drawImage(im, cell * cw, 0, cw, ch, -w / 2, feet - h, w, h);
    g.restore();
    pill(g, name, x, feet - h - 6, { align: "center", size: 10 });
  };
  return {
    id: online ? "extras-online" : "extras-wifi", w: 360, h: 240, duration: 24, images: [...walkers, ...plates], poster: plates[0], pixelated: true,
    label: online ? "Two players, each on their own screen, playing the same game from different places." : "Two players walking the same world together.",
    draw(g, t, img) {
      const drift = (t * 30) % 720; // 24s a full panorama, a whole number of walk cycles
      if (!online) {
        const bg = img(plates[0]);
        if (bg) panorama(g, bg, 0, 360, drift);
        walker(g, img(walkers[0]), 150, 196, t, "You", 0); // feet kept clear of a card that crops its art
        walker(g, img(walkers[1]), 214, 190, t, "Your mate", 2);
        pill(g, "Same wifi", 12, 12, { size: 12 });
        return;
      }
      for (let k = 0; k < 2; k++) {
        const x0 = k * 182;
        g.save();
        g.beginPath();
        g.rect(x0, 0, 178, 240);
        g.clip();
        const bg = img(plates[k]);
        if (bg) panorama(g, bg, x0, 178, drift);
        walker(g, img(walkers[k]), x0 + 89, 194, t, k ? "Your mate" : "You", k * 2);
        g.restore();
      }
      g.fillStyle = INK;
      g.fillRect(178, 0, 4, 240);
      pill(g, "Online, from anywhere", 180, 12, { size: 12, align: "center" });
    },
  };
}
