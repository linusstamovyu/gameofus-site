// Hero lab (hero-lab.html, not in the build): the character-select start screen merged with the scroll walk.
// Owner's grilled picks, 17 Sep 2026 (Q1-Q17):
//   start   Kai's real full-body photo beside his full-body character, worlds dissolving behind; Press start (or any
//           scroll) steps the art out of the pair and shrinks it onto his tile (Q4, Q5, Q7, Q13)
//   walk    you are Kai; scrolling walks to five friends in turn, each met in a new world, and each card holds for a
//           stretch of scroll (Q2, Q6, Q9). The camera starts at the normal zoom and eases out a step per friend (Q8)
//   end     back to the beach in everyone's own clothes, pulled out to the whole map, then a pop-up with the full-size
//           art (Q10); then the pin lets go (Q11). Pausing never changes anything (Q12)
// Two things are left to compare here: the ending (Q1) and whether the card sits beside the map or on it (Q3).
// It drives SeasonWorld as a director and patches a few of its private members from outside: a throwaway preview.
import "../styles.css";
import "./heroLab.css";
import offerData from "../content/offer.json";
import squadData from "../content/squad.json";
import stopsData from "../content/stops.json";
import type { Offer, SquadMember, Stop } from "../content/types";
import { $, asset, el } from "../dom";
import { N, SEASONS } from "../seasons/seasons";
import { SeasonWorld, type Shot } from "../seasons/seasonWorld";
import { FRIENDS, TOTAL, clamp01, logLerp, phaseAt, smoother, zoomAtFriend, type Phase } from "./plan";

type Ending = "squad" | "start" | "end" | "both";
type Layout = "beside" | "top";
const q = new URLSearchParams(location.search);
const pick = <T extends string>(key: string, options: readonly T[]): T => options.find(v => v === q.get(key)) ?? options[0];
const ending = pick<Ending>("ending", ["squad", "start", "end", "both"]);
const layout = pick<Layout>("layout", ["top", "beside"]);
// Always open on the start screen: a reload must not land mid-story and start it behind the visitor's back.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
scrollTo(0, 0);
document.body.dataset.ending = ending;
document.body.dataset.layout = layout;

/* ---------- the squad, with Kai as the player (the world draws its player under the id "rico") ---------- */
const squad = squadData as unknown as SquadMember[];
const byId = new Map(squad.map(m => [m.id, m]));
const kai = byId.get("kai")!, rico = byId.get("rico")!;
const worldSquad = squad.map(m =>
  m.id === "rico" ? { ...kai, id: "rico", walk: "../lab/kai_walk_new.webp" } :
  m.id === "kai" ? { ...rico, id: "kai" } : m);
const cast = new Map(worldSquad.map(m => [m.id, m]));
const stops = stopsData as unknown as Stop[];
const offer = offerData as unknown as Offer;

/** What each friend says. The MAP and STORY signs are no longer stops, so Coco and Ethan carry those (Q6). */
const LINES: Record<string, { eyebrow: string; title: string; text: string; more?: string }> = {
  nala: { eyebrow: "Your squad", title: "Everyone's in it. The dog counts.",
    text: "Every friend becomes a fighter with a type, stats and signature moves. Nala is in as herself, same face, same tongue." },
  kai: { eyebrow: "Games", title: "Kart races, a brawler, a gym you build your way up",
    text: "Big games are the set pieces a chapter is built around. And every mate you meet can deal you in to one of twelve party games, from blackjack to a pour-stopping test of nerve." },
  elias: { eyebrow: "In-jokes become moves", title: "The thing he always does is now an attack",
    text: "Tell us what everyone always does. Elias got a mic and a move called Siren Song." },
  coco: { eyebrow: "Getting around", title: "Pull up in style",
    text: "Cars, scooters, taxis, a mine cart. Walking works too, if you're into that.",
    more: "And the map is your town: the flat, the beach, the bar you always end up in." },
  ethan: { eyebrow: "The phone", title: "It rings. It's usually trouble.",
    text: "Calls kick off the quest and breaking news lands mid-adventure.",
    more: "The quest itself? The night everyone still talks about. Tell us the story and it becomes the game." },
};

/* ---------- the world ---------- */
const stage = $("#stage");
const world = new SeasonWorld(stage, stops, worldSquad, offer, { outfits: "fade" });
const w = world as any; // private members, reached from outside on purpose: this is a throwaway preview
const img = (src: string) => { const i = new Image(); i.src = src; return i; };
// Kai's new world outfits for the player, and Rico's for the friend standing where Kai used to.
for (const t of ["space", "neon", "jungle", "ski", "fairy"]) {
  w.sprites.set(`${t}:walk:rico`, img(`lab/kai_walk_new_${t}.webp`));
  w.sprites.set(`${t}:walk:kai`, img(`worlds/rico_walk_${t}.webp`));
}
SEASONS.forEach(s => w.loadThemeFiles(w.themes[SEASONS.indexOf(s)]));
// The player is not on the map until the art has landed on his tile.
let playerShown = false;
const blank = new Image();
const walkSprite = w.walkSprite.bind(w);
w.walkSprite = (who: string, theme: unknown) => (who === "rico" && !playerShown ? blank : walkSprite(who, theme));

/* ---------- page ---------- */
const track = $("#track"), pin = $("#pin"), startEl = $("#start"), fx = $<HTMLCanvasElement>("#fx");
const photoFig = $("#photoFig"), photoImg = $<HTMLImageElement>("#photoImg"), artImg = $<HTMLImageElement>("#artImg");
const cardSide = $("#cardSide"), cardTop = $("#cardTop"), steps = $("#steps"), hint = $("#hint"), walkBtn = $("#walk");
const endEl = $("#end"), endPanel = $("#endPanel");
if (ending === "end") { photoFig.hidden = true; $("#pairArrow").hidden = true; }

function measure() {
  const nav = document.querySelector<HTMLElement>(".nav");
  document.documentElement.style.setProperty("--nav-h", `${nav?.offsetHeight ?? 62}px`);
  track.style.height = `${pin.offsetHeight * (1 + TOTAL)}px`;
}
new ResizeObserver(measure).observe(pin);
measure();

FRIENDS.forEach(f => {
  const m = cast.get(stops.find(s => s.id === f.stop)?.who ?? "")!;
  const li = el("li");
  const face = el("img"); face.src = asset(m.face); face.alt = "";
  li.append(face, el("span", null, m.name));
  steps.append(li);
});

/* ---------- friend cards ---------- */
function fillCard(box: HTMLElement, i: number) {
  const f = FRIENDS[i], stop = stops.find(s => s.id === f.stop)!, m = cast.get(stop.who!)!, line = LINES[f.stop];
  box.replaceChildren();
  const head = el("div", "hl-card-head");
  const face = el("img"); face.src = asset(m.face); face.alt = "";
  const who = el("div");
  const name = el("b", null, m.name); name.append(el("span", `chip ${m.type}`, m.type));
  who.append(el("p", "eyebrow", line.eyebrow), name);
  head.append(face, who);
  box.append(head, el("h3", null, line.title), el("p", null, line.text));
  if (line.more) box.append(el("p", "hl-more", line.more));
  box.append(el("p", "hl-world", `Met ${w.themes[f.world].place}`));
  const add = el("a", "link-btn", `${stop.add ?? "Add this to my game"} ▶`);
  add.href = `order.html?from=beach&step=${encodeURIComponent(stop.step ?? "")}`;
  box.append(add);
}
let cardShown = -2;
function showCard(i: number) {
  if (i === cardShown) return;
  cardShown = i;
  const box = layout === "top" && matchMedia("(min-width: 761px)").matches ? cardTop : cardSide;
  if (i >= 0) {
    fillCard(box, i);
    box.hidden = false;
    box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
  } else if (i === -1 && box === cardSide) {
    cardSide.replaceChildren(el("p", "hl-side-hint", "Scroll to walk to your friends. Each one shows you part of the game."));
  } else if (i === -3) {
    cardSide.replaceChildren(el("p", "hl-side-hint", "This is Kai. Press start and walk his beach: five friends, five worlds, one game."));
  }
  if (box === cardTop && i < 0) cardTop.hidden = true;
  if (box === cardSide) cardTop.hidden = true;
  [...steps.children].forEach((li, k) => { li.classList.toggle("on", k === i); li.classList.toggle("done", i >= 0 && k < i); });
}

/* ---------- ending ---------- */
function fig(src: string, cls: string, caption: string, alt: string) {
  const f = el("figure", cls); const im = el("img"); im.src = src; im.alt = alt; f.append(im, el("figcaption", null, caption)); return f;
}
function buildEnding() {
  const cta = el("a", "btn", "Make your squad's game ▶"); cta.href = "order.html?from=hero";
  if (ending === "start") {
    endPanel.append(el("p", "eyebrow", "That was Kai's squad"), el("h2", null, "Yours is next."),
      el("p", null, "Send us a photo of each friend and the places you always end up. We build the rest."), cta);
    return;
  }
  if (ending === "squad") {
    const row = el("div", "hl-squad");
    for (const id of ["kai", "rico", "nala", "elias", "coco", "ethan"]) {
      const m = byId.get(id)!;
      const col = el("div", "hl-member");
      const photo = el("img", "hl-member-photo"); photo.src = asset(m.photo!); photo.alt = `${m.name} in real life`;
      const body = el("img", "hl-member-art"); body.src = id === "rico" ? "lab/rico_fullbody_v2.webp" : `lab/${id}_fullbody.webp`; body.alt = `${m.name} in the game`;
      col.append(photo, body, el("b", null, m.name));
      row.append(col);
    }
    endPanel.append(el("p", "eyebrow", "Meet the squad"), el("h2", null, "Every character starts as a real photo."), row, cta);
    return;
  }
  const big = el("div", "hl-kai");
  const arrow = () => { const a = el("span", "hl-arrow", "→"); a.setAttribute("aria-hidden", "true"); return a; };
  const sprite = el("div", "hl-sprite"); sprite.setAttribute("role", "img"); sprite.setAttribute("aria-label", "Kai walking in the game");
  big.append(fig("lab/kai_photo_cut.webp", "hl-photo", "Real photo", "Kai in real life"), arrow(),
    fig("lab/kai_fullbody.webp", "hl-art", "Character", "Kai in the game"), arrow(), fig("", "hl-tiny", "On the map", ""));
  big.lastElementChild!.querySelector("img")!.replaceWith(sprite);
  endPanel.append(el("p", "eyebrow", ending === "both" ? "Remember Kai?" : "Meet Kai"), el("h2", null, "One photo. One playable friend."), big, cta);
}
buildEnding();

/* ---------- the start: Press start, or any scroll ---------- */
// The hand-off, in beats (seconds). The last four are the game's own pick-to-world intro (CharacterIntro.ts):
// the art charges with an evolution-style flash, collapses into the exact box the walk sprite is drawn in, settles,
// and the dark lifts off a world where the real sprite is already standing on that spot.
const BEAT = { gather: 0.5, scan: 1.15, charge: 1.0, shrink: 0.8, settle: 0.3, reveal: 0.5 };
const TRANSFORM = BEAT.gather + BEAT.scan + BEAT.charge + BEAT.shrink + BEAT.settle + BEAT.reveal;
let started = false, transformT = 0, furthest = 0;
/** ?debug: park the transformation at a moment (the browser pane runs frames while it screenshots). */
let heldT: number | null = null;
function start() {
  if (started) return;
  captureStart();
  started = true; transformT = 0; particles.length = 0;
  startEl.classList.add("going");
}
function resetStart() {
  started = false; transformT = 0; furthest = 0; playerShown = false; particles.length = 0;
  startEl.classList.remove("going", "gone");
  const p = w.player; p.cancelRoute(); p.x = p.fx = 9; p.y = p.fy = 8; p.moving = false; p.t = 1; p.facing = "down";
}
$("#press").addEventListener("click", () => { start(); stage.focus({ preventScroll: true }); });

/** Where the player's sprite is on the stage, in CSS px: a box one tile wide and two tall. */
function playerBox() {
  const T: number = w.T, f = w.frameNow as { cx: number; cy: number; z: number }, p = w.player;
  const x = (p.drawX * T - f.cx) * f.z, top = ((p.drawY - 1) * T - f.cy) * f.z;
  return { x, y: top, w: T * f.z, h: 2 * T * f.z };
}

/* ---------- the transformation, drawn on its own canvas over the map ---------- */
interface Box { x: number; y: number; w: number; h: number }
const fxc = fx.getContext("2d")!;
const sheet = img("lab/kai_walk_new.webp");
let photoFrom: Box | null = null, artFrom: Box | null = null;
const rel = (e: Element): Box => {
  const s = stage.getBoundingClientRect(), r = e.getBoundingClientRect();
  return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
};
function captureStart() { photoFrom = photoFig.hidden ? null : rel(photoImg); artFrom = rel(artImg); }
const lerpBox = (a: Box, b: Box, k: number): Box => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k });
/** One figure's box at height h, standing on (cx, bottom). */
const standing = (im: HTMLImageElement, cx: number, bottom: number, h: number): Box => {
  const wd = h * ((im.naturalWidth || 1) / (im.naturalHeight || 1));
  return { x: cx - wd / 2, y: bottom - h, w: wd, h };
};
const silhouettes = new Map<unknown, HTMLCanvasElement>();
function silhouette(src: HTMLImageElement, sx = 0, sw = src.naturalWidth) {
  const key = `${src.src}:${sx}`;
  let c = silhouettes.get(key);
  if (c) return c;
  c = document.createElement("canvas"); c.width = sw; c.height = src.naturalHeight;
  const g = c.getContext("2d")!;
  g.drawImage(src, sx, 0, sw, src.naturalHeight, 0, 0, sw, src.naturalHeight);
  g.globalCompositeOperation = "source-in"; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  silhouettes.set(key, c);
  return c;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; tint: string }
const particles: Particle[] = [];
let spawnDebt = 0;
function spawn(n: number, make: () => Omit<Particle, "life">) {
  spawnDebt += n;
  while (spawnDebt >= 1) { spawnDebt -= 1; particles.push({ ...make(), life: 0 }); }
}

function drawTransform(t: number, dt: number) {
  const dpr = Math.min(2, devicePixelRatio || 1), vw = stage.clientWidth, vh = stage.clientHeight;
  if (fx.width !== Math.round(vw * dpr) || fx.height !== Math.round(vh * dpr)) { fx.width = Math.round(vw * dpr); fx.height = Math.round(vh * dpr); }
  const g = fxc;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, vw, vh);
  if (!started || t >= TRANSFORM || !artFrom) return;

  const t1 = BEAT.gather, t2 = t1 + BEAT.scan, t3 = t2 + BEAT.charge, t4 = t3 + BEAT.shrink, t5 = t4 + BEAT.settle;
  // The stage: dim over the map from the first beat until the reveal lifts it (the game's backdrop).
  const dark = t < t5 ? smoother(t / 0.4) : 1 - clamp01((t - t5) / BEAT.reveal);
  g.fillStyle = `rgba(6, 8, 16, ${0.82 * dark})`;
  g.fillRect(0, 0, vw, vh);

  // Both figures meet on one spot, centred, the same height, feet on one line.
  const bigH = Math.min(vh * 0.66, 470), cx = vw / 2, ground = vh * 0.5 + bigH / 2;
  const artBig = standing(artImg, cx, ground, bigH);
  const photoBig = standing(photoImg, cx, ground, bigH);
  const gather = smoother(t / t1);

  // Energy: a glow behind the figure through the scan and the charge (the game's radial charge glow).
  const energy = t < t1 ? 0 : t < t2 ? 0.35 : t < t3 ? 0.35 + 0.65 * ((t - t2) / BEAT.charge) : t < t4 ? 1 : Math.max(0, 1 - (t - t4) / BEAT.settle);
  if (energy > 0) {
    const cy = ground - bigH / 2, rad = 120 + energy * 300;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, `rgba(255,246,210,${0.4 * energy})`);
    grad.addColorStop(0.5, `rgba(120,200,255,${0.2 * energy})`);
    grad.addColorStop(1, "rgba(120,200,255,0)");
    g.fillStyle = grad; g.fillRect(0, 0, vw, vh);
  }

  // Particles: rising sparks in the charge, pixel chips off the scan line.
  for (const p of particles) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life >= particles[i].max) particles.splice(i, 1);

  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  if (t < t2) {
    // 1. Gather: the photo and the art slide together onto one spot.
    const photoBox = photoFrom ? lerpBox(photoFrom, photoBig, gather) : null;
    const artBox = lerpBox(artFrom, artBig, gather);
    if (t < t1) {
      g.globalAlpha = photoFrom ? 1 - gather * 0.999 : 1;
      if (!photoFrom || gather < 1) { g.globalAlpha = photoFrom ? Math.max(0, 1 - gather * 1.4) : 1; g.drawImage(artImg, artBox.x, artBox.y, artBox.w, artBox.h); }
      g.globalAlpha = 1;
      if (photoBox) g.drawImage(photoImg, photoBox.x, photoBox.y, photoBox.w, photoBox.h);
    } else {
      // 2. Digitise: a bright line sweeps down; above it he is the game art, below it still the photo.
      const k = smoother((t - t1) / BEAT.scan);
      const lineY = artBig.y - 8 + (artBig.h + 16) * k;
      g.save(); g.beginPath(); g.rect(0, 0, vw, lineY); g.clip();
      g.drawImage(artImg, artBig.x, artBig.y, artBig.w, artBig.h);
      g.restore();
      if (photoFrom) {
        g.save(); g.beginPath(); g.rect(0, lineY, vw, vh - lineY); g.clip();
        g.drawImage(photoImg, photoBig.x, photoBig.y, photoBig.w, photoBig.h);
        g.restore();
      } else {
        g.save(); g.beginPath(); g.rect(0, lineY, vw, vh - lineY); g.clip();
        g.globalAlpha = 0.35; g.drawImage(silhouette(artImg), artBig.x, artBig.y, artBig.w, artBig.h);
        g.restore(); g.globalAlpha = 1;
      }
      // The line itself: a glow across the figure's width, brightest where it crosses him.
      const x0 = Math.min(artBig.x, photoBig.x) - 40, x1 = Math.max(artBig.x + artBig.w, photoBig.x + photoBig.w) + 40;
      const band = g.createLinearGradient(0, lineY - 14, 0, lineY + 14);
      band.addColorStop(0, "rgba(127,214,228,0)"); band.addColorStop(0.5, "rgba(210,250,255,0.95)"); band.addColorStop(1, "rgba(127,214,228,0)");
      g.fillStyle = band; g.fillRect(x0, lineY - 14, x1 - x0, 28);
      g.fillStyle = "#ffffff"; g.fillRect(x0 + 10, lineY - 1, x1 - x0 - 20, 2);
      spawn(dt * 70, () => ({
        x: x0 + 20 + Math.random() * (x1 - x0 - 40), y: lineY, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 60,
        max: 0.35 + Math.random() * 0.4, size: 2 + Math.random() * 3, tint: Math.random() < 0.5 ? "#9ff3ff" : "#ffffff",
      }));
    }
  } else if (t < t3) {
    // 3. Charge (game): the art flashes to its white silhouette, faster and brighter.
    const lt = t - t2, prog = lt / BEAT.charge;
    const on = Math.sin(lt * (6 + prog * 26)) > 0;
    const grow = 1 + Math.sin(lt * 8) * 0.03 * prog;
    const r = { x: artBig.x - (artBig.w * (grow - 1)) / 2, y: artBig.y + artBig.h - artBig.h * grow, w: artBig.w * grow, h: artBig.h * grow };
    g.drawImage(artImg, r.x, r.y, r.w, r.h);
    g.globalAlpha = on ? 0.4 + prog * 0.6 : 0.12;
    g.drawImage(silhouette(artImg), r.x, r.y, r.w, r.h);
    g.globalAlpha = 1;
    spawn(dt * (10 + 30 * prog), () => {
      const a = Math.random() * Math.PI * 2, rr = 50 + Math.random() * 120;
      return { x: cx + Math.cos(a) * rr, y: ground - 40 + Math.random() * 60, vx: (Math.random() - 0.5) * 24, vy: -70 - Math.random() * 90,
        max: 0.7 + Math.random() * 0.8, size: 2 + Math.random() * 3, tint: "#fff7cf" };
    });
  } else {
    // 4-6. Shrink into the walk sprite's exact box, settle, and hold there while the dark lifts (game).
    const land = playerBox();
    const cw = (sheet.naturalWidth || 9) / 9;
    const drawSprite = (r: Box, white: number) => {
      g.imageSmoothingEnabled = false;
      g.drawImage(sheet, 0, 0, cw, sheet.naturalHeight, r.x, r.y, r.w, r.h);
      if (white > 0) { g.globalAlpha = Math.min(1, white); g.drawImage(silhouette(sheet, 0, cw), r.x, r.y, r.w, r.h); g.globalAlpha = 1; }
      g.imageSmoothingEnabled = true;
    };
    if (t < t4) {
      const prog = (t - t3) / BEAT.shrink, eased = 1 - Math.pow(1 - prog, 3);
      // The art's box, as tall as the sprite's whole cell would be at that size, so the landing lines up with the cell.
      const artCell = { x: artBig.x - (artBig.h / 0.83 / 2 - artBig.w) / 2, y: artBig.y - artBig.h * (1 / 0.83 - 1), w: artBig.h / 0.83 / 2, h: artBig.h / 0.83 };
      const r = lerpBox(prog < 0.4 ? artBig : artCell, land, eased);
      g.fillStyle = `rgba(0,0,0,${0.3 * eased})`;
      g.beginPath(); g.ellipse(r.x + r.w / 2, r.y + r.h, r.w * 0.4, r.w * 0.1, 0, 0, Math.PI * 2); g.fill();
      if (prog < 0.4) {
        const ra = lerpBox(artBig, land, eased);
        const ar = standing(artImg, ra.x + ra.w / 2, ra.y + ra.h, ra.h * 0.97);
        g.drawImage(artImg, ar.x, ar.y, ar.w, ar.h);
        g.globalAlpha = Math.max(0, 0.8 - prog); g.drawImage(silhouette(artImg), ar.x, ar.y, ar.w, ar.h); g.globalAlpha = 1;
      } else {
        drawSprite(r, Math.max(0, 0.8 - prog));
      }
      if (prog > 0.97 && !particles.some(p => p.tint === "#ffe9a8")) {
        for (let i = 0; i < 30; i++) {
          const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 110;
          particles.push({ x: land.x + land.w / 2, y: land.y + land.h, vx: Math.cos(a) * sp, vy: -Math.abs(Math.sin(a) * sp) * 0.5, life: 0, max: 0.4 + Math.random() * 0.5, size: 1.5 + Math.random() * 2.5, tint: "#ffe9a8" });
        }
      }
    } else if (t < t5) {
      const k = clamp01((t - t4) / BEAT.settle);
      const lift = (1 - k) * (1 - k) * 8 * Math.cos(k * Math.PI * 2);
      drawSprite({ ...land, y: land.y - lift }, Math.max(0, 0.25 - k));
    } else {
      playerShown = true; // the real sprite is under this exact box now
      drawSprite(land, 0);
    }
  }
  for (const p of particles) {
    g.globalAlpha = Math.max(0, 1 - p.life / p.max); g.fillStyle = p.tint;
    g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
}

/* ---------- explore (Q11, Q12) ---------- */
let exploring = false, exploreScroll = 0;
walkBtn.addEventListener("click", () => { exploring = true; exploreScroll = scrollY; showCard(-2); stage.focus({ preventScroll: true }); });

/* ---------- the director ---------- */
/** ?at=4.2 holds the story that many screens in without scrolling (screenshots, and a hidden browser pane). */
const forcedAt = q.has("at") && Number.isFinite(Number(q.get("at"))) ? Math.max(0, Number(q.get("at"))) : null;
let demoPos = 0, lean = 0;
const toward = (dx: number, dy: number) => (Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? "up" : "down") : dx < 0 ? "left" : "right") as Shot["faceWhenStill"];
const blendFrom = (from: number, to: number, f: number) => ({ a: from, b: to, f: from === to ? 0 : f });

world.setDirector(dt => {
  const pinH = pin.offsetHeight || 1;
  const navH = document.querySelector<HTMLElement>(".nav")?.offsetHeight ?? 0;
  // Screens scrolled since the pin stuck: 0 at the top of the page, TOTAL when it lets go.
  const scrolled = forcedAt ?? clamp01((navH - track.getBoundingClientRect().top) / pinH / TOTAL) * TOTAL;
  if (exploring && Math.abs(scrollY - exploreScroll) > 4) exploring = false;
  if (exploring) { walkBtn.hidden = true; return null; }

  const m = world.metrics();
  const shot: Shot = { a: 0, b: 0, f: 0, cx: m.W / 2, cy: m.H / 2, z: 1, follow: 1 };

  if (!started && scrolled > 0.02) start();
  // Scrolling all the way back up to the top brings the start screen back (not a Press start at the top).
  if (started) furthest = Math.max(furthest, scrolled);
  if (started && furthest > 0.15 && scrolled <= 0.005 && transformT >= TRANSFORM) resetStart();

  // Before the start: the worlds take turns behind the pair, slowly (Q13).
  if (!started) {
    demoPos = (demoPos + dt / 3.2) % N;
    const k = Math.floor(demoPos), l = demoPos - k;
    Object.assign(shot, blendFrom(k, (k + 1) % N, smoother((l - 0.6) / 0.4)));
    shot.walkTo = [9, 8];
    showCard(-3); hint.hidden = true; walkBtn.hidden = true; endEl.style.setProperty("--o", "0");
    return shot;
  }

  // The transformation (Q7): the photo steps back, the art flies onto his tile and shrinks, then the sprite takes over.
  if (transformT < TRANSFORM) {
    transformT = heldT ?? Math.min(TRANSFORM, transformT + dt);
    const k = Math.floor(demoPos), l = demoPos - k;
    const settle = smoother(transformT / 0.5);
    Object.assign(shot, blendFrom(k, 0, k === 0 ? 0 : Math.max(smoother((l - 0.6) / 0.4), settle)));
    shot.walkTo = [9, 8]; shot.faceWhenStill = "down";
    drawTransform(transformT, dt);
    if (transformT >= TRANSFORM) { startEl.classList.add("gone"); playerShown = true; drawTransform(TRANSFORM, dt); }
    return shot;
  }

  const ph: Phase = phaseAt(scrolled);
  hint.hidden = ph.kind !== "start";
  walkBtn.hidden = ph.kind === "walk" || ph.kind === "pull";

  let target = -1, worldTo = 0, worldFrom = 0, f = 0, z = 1;
  if (ph.kind === "start") {
    shot.walkTo = [9, 8]; shot.faceWhenStill = "down";
  } else if (ph.kind === "walk" || ph.kind === "hold") {
    const fr = FRIENDS[ph.i], stop = stops.find(s => s.id === fr.stop)!;
    shot.walkTo = [stop.ax, stop.ay];
    worldFrom = ph.i === 0 ? 0 : FRIENDS[ph.i - 1].world; worldTo = fr.world;
    f = ph.kind === "walk" ? smoother(ph.t / 0.85) : 1;
    z = ph.kind === "walk" ? logLerp(zoomAtFriend(ph.i - 1), zoomAtFriend(ph.i), smoother(ph.t)) : zoomAtFriend(ph.i);
    const p = world.playerTile();
    const arrived = Math.abs(p.x - stop.ax) + Math.abs(p.y - stop.ay) < 0.3;
    if (ph.kind === "hold" && arrived) {
      target = ph.i;
      shot.talking = stop.id;
      shot.faceWhenStill = toward(stop.x - stop.ax, stop.y - stop.ay);
    }
  } else {
    const last = FRIENDS[FRIENDS.length - 1], stop = stops.find(s => s.id === last.stop)!;
    shot.walkTo = [stop.ax, stop.ay]; shot.faceWhenStill = "down";
    const t = ph.kind === "pull" ? smoother(ph.t) : 1;
    worldFrom = last.world; worldTo = 0; f = t;
    const zFit = Math.min(m.vw / (m.W * m.T), m.vh / (m.H * m.T));
    z = logLerp(zoomAtFriend(FRIENDS.length - 1), zFit, t);
    shot.follow = 1 - t;
  }
  Object.assign(shot, blendFrom(worldFrom, worldTo, f));
  shot.z = z;

  // The card on the map sits on the right; lean the camera so Kai stays clear of it.
  const cardOnMap = layout === "top" && target >= 0 && matchMedia("(min-width: 761px)").matches;
  lean += ((cardOnMap ? 190 / (z * m.T) : 0) - lean) * Math.min(1, dt * 4);
  shot.ox = lean;

  showCard(target >= 0 ? target : ph.kind === "start" || ph.kind === "walk" ? -1 : -2);

  // The ending pop-up (Q1): after the pull-back, over the pinned view.
  const endOpacity = ph.kind === "end" ? smoother(ph.t / 0.25) : 0;
  endEl.style.setProperty("--o", endOpacity.toFixed(3));
  endEl.classList.toggle("on", endOpacity > 0.5);
  endEl.setAttribute("aria-hidden", String(endOpacity < 0.5));
  return shot;
});

/* ---------- lab switches ---------- */
document.querySelectorAll<HTMLInputElement>("#lab input").forEach(r => {
  r.checked = r.value === (r.name === "ending" ? ending : layout);
  r.addEventListener("change", () => {
    const url = new URL(location.href); url.searchParams.set(r.name, r.value);
    location.assign(url.toString());
  });
});

if (q.has("debug")) Object.assign(window, { __hero: { world: w, start, resetStart, phaseAt, holdT: (t: number | null) => { heldT = t; } } });
