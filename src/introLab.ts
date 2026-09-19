// Dev-only prototype (intro-lab.html, not in the build).
// Hero: three start screens to compare, the worlds cross-dissolving behind them until the visitor presses start (or
// scrolls). Starting settles on Albufeira, shows Rico's real photo beside his full-body character, and shrinks the
// character onto his tile the way the game hands off from character select. Squad: layouts and card backgrounds.
// It drives the real BeachWorld and only patches its instance from outside.
import "./styles.css";
import "./introLab.css";
import offerData from "./content/offer.json";
import squadData from "./content/squad.json";
import stopsData from "./content/stops.json";
import type { Offer, SquadMember, Stop } from "./content/types";
import { $, asset, el } from "./dom";
import type { BeachMap } from "./world/map";
import { findPath, type Tile } from "./world/path";
import { THEMES } from "./world/themes";
import { BeachWorld } from "./world/world";

type Mode = "press" | "scroll";
type Layout = "card" | "select" | "bubble";
type SquadLayout = "steps" | "full" | "squares";
type CardBg = "split" | "world" | "type" | "spot";
const q = new URLSearchParams(location.search);
const pick = <T extends string>(key: string, options: readonly T[]): T => options.find(v => v === q.get(key)) ?? options[0];
const mode = pick<Mode>("mode", ["press", "scroll"]);
const layout = pick<Layout>("layout", ["select", "card", "bubble"]);
let squadLayout = pick<SquadLayout>("squad", ["steps", "full", "squares"]);
let cardBg = pick<CardBg>("cardbg", ["spot", "world", "split", "type"]);
const opts = { photo: q.get("photo") !== "0", you: q.get("you") !== "0", hint: q.get("hint") !== "0" };
document.body.dataset.mode = mode;
document.body.dataset.layout = layout;

const squad = squadData as unknown as SquadMember[];
const stops = stopsData as unknown as Stop[];
const offer = offerData as unknown as Offer;
const PLAYER = "rico";
const HERO = squad.find(m => m.id === PLAYER)!;

const stage = $("#stage");
const world = new BeachWorld(stage, stops, squad, offer);
const w = world as any; // private fields, reached from outside on purpose: this is a throwaway preview
const map: BeachMap = w.map;
THEMES.forEach(t => w.loadThemeFiles(t)); // warm every world, so a dissolve never lands on a half-loaded one

/* ---------- art ---------- */
const img = (src: string) => { const i = new Image(); i.src = src; return i; };
const heroPhoto = img(asset(HERO.photo!));
const heroBody = img("lab/rico_fullbody.webp"); // PLACEHOLDER: this plate shows a bong and must be redrawn before it ships
const ready = (i: HTMLImageElement) => i.complete && i.naturalWidth > 0;
let bodyWhite: HTMLCanvasElement | null = null;
function whiteBody() {
  if (bodyWhite || !ready(heroBody)) return bodyWhite;
  const c = document.createElement("canvas"); c.width = heroBody.naturalWidth; c.height = heroBody.naturalHeight;
  const g = c.getContext("2d")!; g.drawImage(heroBody, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  return (bodyWhite = c);
}
const bodyAspect = () => (ready(heroBody) ? heroBody.naturalWidth / heroBody.naturalHeight : 0.42);

/* ---------- timeline ---------- */
type Span = [number, number];
interface Beats { dim: Span; photoIn: Span | null; bodyIn: Span | null; photoOut: Span | null; centre: Span | null; flash: Span; shrink: Span; reveal: Span; end: number; lines: [number, number, string][] }
const LAST_LINE = `…and on this beach, you're ${HERO.name}.`;
function beats(): Beats {
  if (layout === "select") {
    // He is already standing there, big: the photo joins him, then he shrinks onto his tile.
    if (opts.photo) return { dim: [0, 0.4], photoIn: [0.3, 0.7], bodyIn: null, photoOut: [2.0, 2.4], centre: null, flash: [2.1, 2.8], shrink: [2.8, 3.6], reveal: [3.7, 4.3], end: 5.2,
      lines: [[0.4, 2.0, `This is ${HERO.name}, from one photo.`], [2.0, 3.6, "…as a playable character."], [3.7, 9, LAST_LINE]] };
    return { dim: [0, 0.3], photoIn: null, bodyIn: null, photoOut: null, centre: null, flash: [0.2, 0.9], shrink: [0.9, 1.7], reveal: [1.8, 2.4], end: 3.3, lines: [[1.8, 9, LAST_LINE]] };
  }
  if (opts.photo) return { dim: [0, 0.4], photoIn: [0.3, 0.7], bodyIn: [1.2, 1.6], photoOut: [2.1, 2.5], centre: [2.1, 2.6], flash: [2.5, 3.2], shrink: [3.2, 4.0], reveal: [4.1, 4.7], end: 5.6,
    lines: [[0.4, 1.2, `This is ${HERO.name}.`], [1.2, 3.1, "His character, made from that photo."], [4.1, 9, LAST_LINE]] };
  return { dim: [0, 0.4], photoIn: null, bodyIn: [0.3, 0.7], photoOut: null, centre: null, flash: [0.8, 1.5], shrink: [1.5, 2.3], reveal: [2.4, 3.0], end: 3.9,
    lines: [[0.3, 1.5, `This is ${HERO.name}, in the game.`], [2.4, 9, LAST_LINE]] };
}
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const at = (s: Span | null, t: number) => (s ? clamp01((t - s[0]) / (s[1] - s[0])) : 1);
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

let started = false, done = false, introT = 0;
let engaged = false, markerAlpha = 0;
let hintPath: Tile[] = [];
const SCROLL_RANGE = 900;

const fx = $<HTMLCanvasElement>("#introFx");
const fctx = fx.getContext("2d")!;
const line = $("#introLine");

/* ---------- worlds: take turns before the start, cross-dissolving; settle on Albufeira when it starts ---------- */
const DEMO_SECONDS = 3.4, DISSOLVE_SECONDS = 1.1;
let demoLeft = DEMO_SECONDS, dissolveLeft = 0;
let snapshot: HTMLCanvasElement | null = null;
const storedWorld = (() => { try { return localStorage.getItem("gou-world"); } catch { return null; } })();
function labelWorld() {
  const t = w.theme;
  const label = $("#nowLabel"); label.textContent = t.label;
  label.style.animation = "none"; void label.offsetWidth; label.style.animation = "";
  $("#nowSwatch").style.background = `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)`;
}
/** A change nobody asked for: hold a picture of the old world over the new one and fade it out. No trip through black. */
function dissolveTo(id: string) {
  if (w.theme.id === id) return;
  const src: HTMLCanvasElement = w.ctx.canvas;
  snapshot ??= document.createElement("canvas");
  snapshot.width = src.width; snapshot.height = src.height;
  snapshot.getContext("2d")!.drawImage(src, 0, 0);
  w.setTheme(id);
  w.swapLeft = 0; // BeachWorld's own change fades through the stage colour; keep that for a picked world only
  dissolveLeft = DISSOLVE_SECONDS;
  try { if (storedWorld === null) localStorage.removeItem("gou-world"); else localStorage.setItem("gou-world", storedWorld); } catch { /* not stored */ }
  labelWorld();
}
function tickWorlds(dt: number) {
  if (dissolveLeft > 0) dissolveLeft = Math.max(0, dissolveLeft - dt);
  if (started) return;
  demoLeft -= dt;
  if (demoLeft <= 0) {
    demoLeft = DEMO_SECONDS;
    const i = THEMES.findIndex(t => t.id === w.theme.id);
    dissolveTo(THEMES[(i + 1) % THEMES.length].id);
  }
}

/* ---------- state ---------- */
function setState() {
  stage.classList.toggle("intro-playing", started && !done);
  stage.classList.toggle("intro-done", done);
  $("#titleCard").hidden = done;
  $("#miniTitle").hidden = true;
}
function start() {
  if (started) return;
  started = true;
  dissolveTo("beach"); // the photo matches his own clothes, and those are the beach's
  setState();
}
function finish() { start(); done = true; introT = beats().end; setState(); line.hidden = true; }
function replay() {
  w.closeCard?.();
  const p = w.player;
  p.x = p.fx = 9; p.y = p.fy = 8; p.t = 1; p.moving = false; p.facing = "down"; p.cancelRoute();
  started = false; done = false; introT = 0; engaged = false; markerAlpha = 0; demoLeft = DEMO_SECONDS;
  hintPath = pickHintPath();
  if (w.theme.id !== "beach") { w.setTheme("beach"); w.swapLeft = 0; }
  labelWorld();
  setState();
  if (mode === "scroll") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}
function pickHintPath(): Tile[] {
  const p = w.player; let best: Tile[] | null = null;
  for (const s of stops.filter(s => s.kind === "npc")) {
    const path = findPath(map, p.x, p.y, s.ax, s.ay);
    if (path && path.length >= 3 && (!best || path.length < best.length)) best = path;
  }
  return best ?? [];
}

// Until the intro is over, a click or key on the beach starts it (press mode) or skips it.
const gate = (e: Event) => {
  if (done || !stage.contains(e.target as Node)) return;
  e.stopPropagation(); e.preventDefault();
  if (mode === "press" && !started) start(); else finish();
  stage.focus({ preventScroll: true });
};
window.addEventListener("pointerdown", gate, true);
window.addEventListener("keydown", gate, true);
w.hideTitle = () => { /* the title card belongs to the intro now */ };

// On the character-select screen the big art IS him, so the small sprite waits; elsewhere he stands on his tile from
// the first frame and only steps off it while his full-body art is on screen.
const originalWalkSprite = w.walkSprite.bind(w);
const BLANK = new Image();
function playerHidden() {
  if (done) return false;
  if (!started) return layout === "select";
  return at(beats().reveal, introT) <= 0 && introT > 0.05;
}
w.walkSprite = (who: string) => (who === PLAYER && playerHidden() ? BLANK : originalWalkSprite(who));

const originalRender = w.render.bind(w);
w.render = () => {
  const b = beats(), dt: number = w.dt;
  tickWorlds(dt);
  if (mode === "scroll" && !done) {
    const k = clamp01(window.scrollY / SCROLL_RANGE);
    if (k > 0.01) start();
    if (started) introT = k * b.end;
    if (k >= 1) finish();
  } else if (started && !done) {
    introT = Math.min(b.end, introT + dt);
    if (introT >= b.end) finish();
  }
  originalRender();
  draw(b, dt);
};

/* ---------- drawing ---------- */
function draw(b: Beats, dt: number) {
  const dpr: number = w.dpr, vw: number = w.vw, vh: number = w.vh;
  if (fx.width !== Math.round(vw * dpr) || fx.height !== Math.round(vh * dpr)) { fx.width = Math.round(vw * dpr); fx.height = Math.round(vh * dpr); }
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fctx.clearRect(0, 0, vw, vh);
  if (dissolveLeft > 0 && snapshot) {
    fctx.globalAlpha = ease(dissolveLeft / DISSOLVE_SECONDS);
    fctx.imageSmoothingEnabled = true;
    fctx.drawImage(snapshot, 0, 0, vw, vh);
    fctx.globalAlpha = 1;
  }

  const T: number = w.T, cam = w.cam, p = w.player, time: number = w.time;
  const px = p.drawX * T - cam.x, py = p.drawY * T - T - cam.y;
  const sx = px + T / 2, head = py + T * 0.15;
  const land = { cx: px + T * 0.492, bottom: py + 2 * T * 0.992, h: 2 * T * 0.883 };

  // Where the big art stands before and at the start.
  const heroH = vh * 0.8, heroBottom = vh * 0.95, heroCx = vw * 0.72;
  const heroW = heroH * bodyAspect();
  if (layout === "select") $("#selectCta").style.right = `${vw - (heroCx - heroW / 2) + 12}px`;
  if (layout === "bubble") {
    const bubble = $("#ricoBubble");
    bubble.style.transform = `translate(${sx - bubble.offsetWidth / 2}px, ${head - bubble.offsetHeight - 18}px)`;
  }

  // Before the start: on the character-select screen he stands big on the right, breathing.
  if (layout === "select" && !started && ready(heroBody)) {
    const breathe = 1 + Math.sin(time * 2.2) * 0.006;
    fctx.fillStyle = "rgba(20,30,40,.22)";
    fctx.beginPath(); fctx.ellipse(heroCx, heroBottom - 4, heroW * 0.55, 12, 0, 0, 7); fctx.fill();
    fctx.drawImage(heroBody, heroCx - heroW / 2, heroBottom - heroH * breathe, heroW, heroH * breathe);
  }

  const t = introT;
  if (!started || done) { line.hidden = true; drawMarkers(dt, sx, head, py); return; }

  const reveal = b.reveal ? clamp01((t - b.reveal[0]) / (b.reveal[1] - b.reveal[0])) : 0;
  fctx.fillStyle = `rgba(14,18,28,${0.72 * ease(clamp01((t - b.dim[0]) / (b.dim[1] - b.dim[0]))) * (1 - reveal)})`;
  fctx.fillRect(0, 0, vw, vh);

  const bigH = layout === "select" ? heroH : vh * 0.6;
  const bigBottom = layout === "select" ? heroBottom : vh * 0.12 + bigH;
  const bodyW = bigH * bodyAspect();
  const photoS = (layout === "select" ? heroH * 0.46 : bigH * 0.62), gap = Math.max(40, vw * 0.05);
  const pairCx = vw / 2;
  const bodyStartCx = layout === "select" ? heroCx : pairCx + gap / 2 + bodyW / 2;
  const photoCx = layout === "select" ? heroCx - heroW / 2 - gap - photoS / 2 : pairCx - gap / 2 - photoS / 2;
  const photoBottom = layout === "select" ? heroBottom - heroH * 0.35 : bigBottom;
  const labelY = photoBottom + 22;
  const inPhotoPhase = (s: Span | null) => (s ? t < s[0] : false);

  if (b.photoIn) {
    const k = ease(clamp01((t - b.photoIn[0]) / (b.photoIn[1] - b.photoIn[0])));
    const out = b.photoOut ? ease(clamp01((t - b.photoOut[0]) / (b.photoOut[1] - b.photoOut[0]))) : 0;
    const a = k * (1 - out);
    if (a > 0.001) {
      const s = photoS * (0.85 + 0.15 * k), cx = photoCx - out * vw * 0.1, top = photoBottom - s - 10 + (1 - k) * 20;
      fctx.globalAlpha = a;
      fctx.fillStyle = "rgba(0,0,0,.3)"; fctx.fillRect(cx - s / 2 - 4, top - 4, s + 20, s + 20);
      fctx.fillStyle = "#fdf6e3"; fctx.fillRect(cx - s / 2 - 10, top - 10, s + 20, s + 20);
      fctx.strokeStyle = "#20242c"; fctx.lineWidth = 4; fctx.strokeRect(cx - s / 2 - 10, top - 10, s + 20, s + 20);
      if (ready(heroPhoto)) { fctx.imageSmoothingEnabled = true; fctx.drawImage(heroPhoto, cx - s / 2, top, s, s); }
      pill(fctx, "REAL PHOTO", cx, labelY, 15, "#fdf6e3", "#20242c");
      fctx.globalAlpha = 1;
    }
  }

  const inK = b.bodyIn ? ease(clamp01((t - b.bodyIn[0]) / (b.bodyIn[1] - b.bodyIn[0]))) : 1;
  const centre = b.centre ? ease(clamp01((t - b.centre[0]) / (b.centre[1] - b.centre[0]))) : 0;
  const shrink = clamp01((t - b.shrink[0]) / (b.shrink[1] - b.shrink[0]));
  if (inK > 0 && reveal < 1) {
    let cx = lerp(bodyStartCx, b.centre ? pairCx : bodyStartCx, centre), bottom = bigBottom + (1 - inK) * 24, h = bigH;
    const sk = ease(shrink);
    cx = lerp(cx, land.cx, sk); bottom = lerp(bottom, land.bottom, sk);
    h = Math.exp(lerp(Math.log(h), Math.log(land.h), sk));
    const bw = h * bodyAspect();
    const cross = clamp01((shrink - 0.6) / 0.4);
    const bodyA = inK * (1 - cross) * (1 - reveal);
    if (ready(heroBody) && bodyA > 0.001) {
      fctx.globalAlpha = bodyA; fctx.imageSmoothingEnabled = true;
      fctx.drawImage(heroBody, cx - bw / 2, bottom - h, bw, h);
      const f = clamp01((t - b.flash[0]) / (b.flash[1] - b.flash[0]));
      if (f > 0 && f < 1) {
        const pulse = Math.max(0, Math.sin(f * Math.PI * 3)) * (0.35 + 0.6 * f);
        const wb = whiteBody();
        if (wb) { fctx.globalAlpha = bodyA * pulse; fctx.drawImage(wb, cx - bw / 2, bottom - h, bw, h); }
      }
      fctx.globalAlpha = 1;
    }
    if (b.photoIn && t >= b.photoIn[0] && inPhotoPhase(b.photoOut) && inK > 0.5) {
      fctx.globalAlpha = Math.min(1, (inK - 0.5) * 2); pill(fctx, "IN GAME", cx, layout === "select" ? heroBottom - 40 : labelY, 15, "#1a9e95", "#ffffff"); fctx.globalAlpha = 1;
    }
    const sheet: HTMLImageElement | undefined = originalWalkSprite(PLAYER);
    if (cross > 0 && sheet && ready(sheet)) {
      const fh = h / 0.883, fw = fh / 2;
      fctx.globalAlpha = cross * (1 - reveal); fctx.imageSmoothingEnabled = false;
      fctx.drawImage(sheet, 0, 0, sheet.naturalWidth / 9, sheet.naturalHeight, cx - fw * 0.492, bottom - fh * 0.992, fw, fh);
      fctx.globalAlpha = 1;
    }
  }

  const said = b.lines.find(([a, z]) => t >= a && t < z);
  line.hidden = !said;
  if (said) line.textContent = said[2];
}

function pill(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, size: number, bg: string, fg: string) {
  ctx.font = `700 ${size}px "Pixelify Sans", monospace`;
  const tw = ctx.measureText(text).width, padX = size * 0.6, h = size * 1.7, x = cx - tw / 2 - padX;
  ctx.fillStyle = bg; ctx.fillRect(x, y, tw + padX * 2, h);
  ctx.strokeStyle = "#20242c"; ctx.lineWidth = 3; ctx.strokeRect(x, y, tw + padX * 2, h);
  ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, cx, y + h / 2 + 1);
}

/** After the intro: who you are, and where to go first. Both go the moment the player does anything. */
function drawMarkers(dt: number, sx: number, head: number, py: number) {
  const p = w.player;
  if (done && !engaged && (p.moving || p.path.length || !$("#card").hidden)) engaged = true;
  const want = done && !engaged ? 1 : 0;
  markerAlpha += (want - markerAlpha) * Math.min(1, dt * (want ? 5 : 7));
  if (markerAlpha < 0.01) return;
  const T: number = w.T, cam = w.cam, time: number = w.time, a = markerAlpha;
  const feet = py + T * 1.9;
  const ctx = fctx; ctx.save();
  if (opts.hint) {
    hintPath.forEach(([tx, ty], i) => {
      const dx = tx * T + T / 2 - cam.x, dy = ty * T + T / 2 - cam.y, pulse = 0.5 + 0.5 * Math.sin(time * 6 - i * 0.9);
      ctx.globalAlpha = a * (0.45 + 0.55 * pulse); ctx.fillStyle = "#fdf6e3"; ctx.strokeStyle = "#127269"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(dx, dy, T * 0.11 + pulse * 2.5, 0, 7); ctx.fill(); ctx.stroke();
    });
    ctx.globalAlpha = a;
    const y = feet + T * 0.25 + 8;
    pill(ctx, w.focused ? "WASD to walk" : "Click the sand to walk", sx, y, Math.max(12, Math.round(T * 0.21)), "#fdf6e3", "#20242c");
    ctx.fillStyle = "#20242c"; ctx.beginPath(); ctx.moveTo(sx - 8, y); ctx.lineTo(sx, y - 9); ctx.lineTo(sx + 8, y); ctx.closePath(); ctx.fill();
  }
  if (opts.you) {
    for (let i = 0; i < 2; i++) {
      const k = (time * 0.9 + i * 0.5) % 1;
      ctx.globalAlpha = a * (1 - k); ctx.strokeStyle = "#f2c14e"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(sx, feet, T * (0.35 + 0.55 * k), T * (0.14 + 0.22 * k), 0, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = a;
    const ay = head - 10 + Math.sin(time * 5) * 5;
    ctx.fillStyle = "#f2c14e"; ctx.strokeStyle = "#20242c"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx - 11, ay - 14); ctx.lineTo(sx + 11, ay - 14); ctx.lineTo(sx, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
    const size = Math.max(13, Math.round(T * 0.24));
    pill(ctx, `YOU · ${HERO.name.toUpperCase()}`, sx, ay - 20 - size * 1.7, size, "#f2c14e", "#20242c");
  }
  ctx.restore();
}

/* ---------- squad ---------- */
// The place each of them belongs to on the flagship map, for the "their place" background.
const PLACE: Record<string, string> = {
  rico: "bg_beach.webp", kai: "bg_kai_gym_mid.webp", elias: "bg_nightclub_exterior.webp",
  ethan: "bg_oura_street.webp", nala: "bg_gym1_interior.webp", coco: "bg_harbour.webp",
};
function figure(cls: string | null, caption: string, media: HTMLElement) {
  const f = el("figure", cls); f.append(media, el("figcaption", null, caption)); return f;
}
function image(src: string, cls: string, alt: string) { const i = el("img", cls); i.src = src; i.alt = alt; return i; }
function arrow() { const s = el("span", "arrow", "→"); s.setAttribute("aria-hidden", "true"); return s; }
function renderSquad() {
  const roster = $("#roster"); roster.replaceChildren();
  for (const m of squad) {
    if (!m.photo) continue;
    const card = el("article", "lad");
    const row = el("div", `sbs ${squadLayout} bg-${cardBg} ${m.type}`);
    row.style.setProperty("--place", `url(${asset(PLACE[m.id] ?? "bg_beach.webp")})`);
    const photo = figure(null, "Real photo", image(asset(m.photo), "photo", `${m.name} in real life`));
    if (squadLayout === "full") {
      row.append(photo, arrow(), figure("game", "In game", image(`lab/${m.id}_fullbody.webp`, "body", `${m.name} in the game`)));
    } else if (squadLayout === "squares") {
      row.append(photo, arrow(), figure("game", "In game", image(asset(m.face), "sbs-art", `${m.name} in the game`)));
    } else {
      const walk = el("div", "walk"); walk.style.backgroundImage = `url(${asset(m.walk)})`;
      walk.setAttribute("role", "img"); walk.setAttribute("aria-label", `${m.name} walking in the game`);
      row.append(photo, arrow(), figure("game", "Portrait", image(asset(m.face), "sbs-art", `${m.name}'s portrait`)), arrow(), figure("game", "Walking", walk));
    }
    const info = el("div", "info");
    const h = el("h3", null, m.name); h.append(el("span", `chip ${m.type}`, m.type));
    info.append(h, el("p", null, m.line.replace(" You play as him on the beach above.", "")), el("span", "move", `Signature move: ${m.move}`));
    card.append(row, info);
    roster.append(card);
  }
}

/* ---------- lab bar ---------- */
const setParam = (k: string, v: string) => { const u = new URL(location.href); u.searchParams.set(k, v); history.replaceState(null, "", u); };
const radios = (name: string, current: string, onChange: (v: string) => void) =>
  document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach(r => {
    r.checked = r.value === current;
    r.addEventListener("change", () => { setParam(name, r.value); onChange(r.value); });
  });
radios("mode", mode, () => location.reload());
radios("layout", layout, () => location.reload());
radios("squad", squadLayout, v => { squadLayout = v as SquadLayout; renderSquad(); });
radios("cardbg", cardBg, v => { cardBg = v as CardBg; renderSquad(); });
document.querySelectorAll<HTMLInputElement>("[data-opt]").forEach(box => {
  const key = box.dataset.opt as keyof typeof opts;
  box.checked = opts[key];
  box.addEventListener("change", () => { opts[key] = box.checked; setParam(key, box.checked ? "1" : "0"); replay(); });
});
$("#replay").addEventListener("click", () => { replay(); if (mode === "press") stage.scrollIntoView({ block: "center", behavior: "smooth" }); });
document.querySelectorAll(".start-btn").forEach(b => b.addEventListener("click", start));

renderSquad();
replay();
if (q.has("debug")) Object.assign(window, { __lab: { start, finish, replay, dissolveTo, world: w, state: () => ({ started, done, introT, engaged, markerAlpha, dissolveLeft, theme: w.theme.id }) } });
