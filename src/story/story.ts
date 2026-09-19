// The homepage season story (owner, 16-17 Sep 2026, grilled): scrolling down opens the playable map out to full
// screen, pins it, and plays the year: Rico walks the beach in season order while the camera pulls back, the lads
// he passes each say one thing the game can do, and it ends on his face beside his real photo. Stop scrolling and
// the map wakes up so you can walk and talk. Then the pin releases into the page.
//
// It is built around the hero that is already in index.html, rearranged here so that file stays untouched:
//   header.hero > .story-track (tall) > .story-pin (sticky, one screen) > #stage (the whole pin)
// The canvas always covers the whole pin; what shows is a WINDOW inside it (the old card, growing to full screen),
// cut with clip-path. So the canvas never resizes while you scroll, and the ground never has to be repainted.
// The map's own overlays (title card, picker, tour bar) move into that window; its cards stay usable while exploring.
//
// Scroll gives a progress p; storyline.ts turns it into beats; this file turns beats into a Shot for the world
// (worlds, camera, where Rico walks) and into the page around it (window, word, dialogue, polaroid, nav).
import type { SquadMember } from "../content/types";
import { asset, el } from "../dom";
import { N, SEASONS, blendAt } from "../seasons/seasons";
import type { Rect, SeasonWorld, Shot } from "../seasons/seasonWorld";
import {
  EXPLORE_AFTER, HEAD, SPEAKER_AT, STORY, WALK, beats, faceTowards, clamp01, holdPos, lerp, logLerp, smoother, talkAt, typed,
  walkGoal, wordOpacity, type Talk,
} from "./storyline";

const PULL_CLOSE = 1.8;      // the year starts this close on Rico and pulls back to the whole map
const PROGRESS_RATE = 10;    // 1/s: a wheel notch moves the story smoothly, not in steps
const WAKE_RATE = 5;         // 1/s: how fast the map wakes up for exploring, and dozes off again

/** Where the face ending puts Rico's head on screen, and how big (share of the screen's height). */
const FACE = {
  wide: { fx: 0.66, fy: 0.47, h: 0.4 },
  tall: { fx: 0.5, fy: 0.3, h: 0.24 },
};

export class SeasonStory {
  private world: SeasonWorld | null = null;
  private readonly soft = matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(location.search).get("motion") === "soft";
  private readonly canExplore = new URLSearchParams(location.search).get("explore") !== "0";
  private p = 0; private first = true; private time = 0;
  private tucked = false; private film = false;
  private ghost: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private trackTop = 0; private scrollLen = 1; private pinH = 1;
  private forced: number | null = null; private snapped = false;
  /** The camera leans towards whoever is talking, eased so a new speaker is a pan and not a cut. */
  private lean = { x: 0, y: 0 };
  private lastTarget = -1; private still = 0; private wake = 0;
  private talk: Talk | null = null; private talkStart = 0; private shownChars = -1;
  private readonly squad = new Map<string, SquadMember>();
  private readonly vars = new Map<string, string>();

  private readonly track = el("div", "story-track");
  private readonly pin = el("div", "story-pin");
  private readonly ghostEl = el("div", "story-ghost");
  private readonly win = el("div", "story-window");
  private readonly word = el("p", "story-word");
  private readonly line = el("div", "story-line");
  private readonly skip = el("button", "story-skip", "Skip ↓");
  private readonly say = el("div", "story-say");
  private readonly sayFace = el("img");
  private readonly sayName = el("b");
  private readonly sayTyped = el("span", "typed");
  private readonly sayRest = el("span", "rest");
  private readonly wander = el("p", "story-wander");
  private readonly lens = el("div", "story-lens");

  constructor(private readonly stage: HTMLElement, squad: SquadMember[]) {
    squad.forEach(m => this.squad.set(m.id, m));
    const q = new URLSearchParams(location.search);
    const hero = stage.closest<HTMLElement>(".hero")!;
    const wrap = stage.parentElement!;
    const skipRow = wrap.querySelector(".skip");
    hero.classList.add("story");
    document.body.classList.add("story-on");
    if (this.soft) document.body.classList.add("story-soft");

    // Everything on the map except the canvas moves into the window.
    [...stage.children].filter(c => c.tagName !== "CANVAS").forEach(c => this.win.append(c));
    stage.classList.add("story-stage");

    this.word.setAttribute("aria-hidden", "true");
    const ticks = el("span", "story-ticks");
    for (let i = 0; i < N; i++) ticks.append(el("i"));
    this.line.append(el("b"), ticks);
    this.line.setAttribute("aria-hidden", "true");
    this.skip.type = "button";
    this.skip.setAttribute("aria-label", "Skip the seasons and go to the rest of the page");
    this.skip.addEventListener("click", () => this.skipPast());

    // The dialogue box: the game's own, a face, a name and the line typing out.
    this.say.setAttribute("aria-live", "polite");
    this.sayFace.alt = ""; this.sayFace.decoding = "async";
    const text = el("p");
    this.sayRest.setAttribute("aria-hidden", "true");
    text.append(this.sayTyped, this.sayRest);
    const body = el("div");
    body.append(this.sayName, text);
    this.say.append(this.sayFace, body, el("i", "more"));

    this.wander.textContent = matchMedia("(pointer: coarse)").matches
      ? "Have a look around: tap to walk, tap a lad to talk. Scroll to carry on."
      : "Have a look around: click to walk, click a lad to talk. Scroll to carry on.";

    // The ending: Rico's real photo as a polaroid beside his pixel face, like the stop cards do it.
    const rico = this.squad.get("rico");
    this.lens.setAttribute("aria-hidden", "true");
    const pol = el("figure", "story-polaroid");
    const photo = el("img");
    photo.alt = ""; photo.decoding = "async";
    if (rico?.photo) photo.src = asset(rico.photo);
    photo.addEventListener("error", () => pol.remove());
    pol.append(photo, el("figcaption", null, "Real photo"));
    const cap = el("p", "story-cap");
    cap.append(el("span", null, `Meet ${rico?.name ?? "Rico"}`), document.createTextNode("Every character starts as a real photo."));
    // A chunky pixel arrow, real → game (turned to point up on a tall screen).
    const arrow = el("span", "story-arrow");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 8 8");
    svg.setAttribute("shape-rendering", "crispEdges");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M0 3h4V1h1v1h1v1h1v2H6v1H5v1H4V5H0z");
    path.setAttribute("fill", "currentColor");
    svg.append(path);
    arrow.append(svg);
    this.lens.append(el("div", "story-vignette"), pol, arrow, el("p", "story-ingame", "In game"), cap);

    stage.append(this.win, this.lens, this.word, this.say, this.wander, this.line, this.skip);
    const ghostWrap = el("div", "wrap story-ghostwrap");
    ghostWrap.append(this.ghostEl);
    this.pin.append(stage, ghostWrap);
    if (skipRow) { const row = el("div", "wrap story-skiprow"); row.append(skipRow); this.pin.append(row); }
    this.track.append(this.pin);
    wrap.replaceWith(this.track);

    new ResizeObserver(() => this.measure()).observe(this.pin);
    addEventListener("resize", () => this.measure());
    document.fonts?.ready.then(() => this.measure());
    this.measure();
    // ?at=0.4 holds the story 40% of the way through without scrolling (headless screenshots ignore the scroll).
    const at = Number(q.get("at"));
    if (q.has("at") && Number.isFinite(at)) this.forced = clamp01(at);
  }

  attach(world: SeasonWorld) {
    this.world = world;
    world.setWindow(this.ghost);
    world.setDirector(dt => this.direct(dt));
  }

  /* ---------- layout ---------- */
  private measure() {
    const nav = document.querySelector<HTMLElement>(".nav");
    document.documentElement.style.setProperty("--nav-h", `${nav?.offsetHeight ?? 0}px`);
    const pr = this.pin.getBoundingClientRect(), gr = this.ghostEl.getBoundingClientRect();
    this.ghost = { x: gr.left - pr.left, y: gr.top - pr.top, w: gr.width, h: gr.height };
    this.pinH = this.pin.clientHeight;
    this.trackTop = this.track.getBoundingClientRect().top + scrollY;
    this.scrollLen = Math.max(1, this.track.offsetHeight - this.pinH);
  }
  private skipPast() {
    const next = document.getElementById("features");
    const top = next ? next.getBoundingClientRect().top + scrollY : this.trackTop + this.scrollLen + this.pinH;
    window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  }

  /* ---------- the director ---------- */
  private direct(dt: number): Shot | null {
    const world = this.world!;
    this.time += dt;
    const target = this.forced ?? clamp01((scrollY - this.trackTop) / this.scrollLen);
    if (Math.abs(target - this.lastTarget) > 1e-5) { this.still = 0; this.lastTarget = target; } else this.still += dt;
    if (this.first || Math.abs(target - this.p) > 0.25) { this.p = target; this.first = false; }
    else { this.p += (target - this.p) * Math.min(1, dt * PROGRESS_RATE); if (Math.abs(target - this.p) < 1e-4) this.p = target; }

    const b = beats(this.p);
    const live = b.u >= 0.02;
    this.setFilm(live);
    if (!live) {
      this.wake = 0;
      this.setWindow(this.ghost, 1);
      this.setTucked(false);
      this.paint(b.u, 0, 0, 0);
      world.setWindow(this.ghost);
      return null;
    }

    // Stop scrolling during the year and the map wakes up. Any scroll puts it back to sleep at once.
    const inYear = b.u >= 1 && b.u < STORY.grow + STORY.year - 0.02;
    const exploring = this.canExplore && inYear && this.still >= EXPLORE_AFTER;
    this.wake = exploring ? Math.min(1, this.wake + dt * WAKE_RATE) : Math.max(0, this.wake - dt * WAKE_RATE * 2);
    document.body.classList.toggle("story-explore", this.wake > 0.5);

    const m = world.metrics();
    const full: Rect = { x: 0, y: 0, w: m.vw, h: m.vh };
    const rest = world.restIndex;
    const me = world.playerTile();

    // Worlds: the grow dissolves the picked world back to summer; the year plays in order with holds, and while
    // exploring it settles on the nearer whole world.
    let a = rest, bw = 0, f = rest === 0 ? 0 : b.g, pos = 0;
    if (b.u >= 1) {
      const year = holdPos(b.y, N);
      pos = year + (Math.round(year) - year) * this.wake;
      ({ a, b: bw, f } = blendAt(pos));
    }

    // Who is talking: whoever Rico is walking past, while he is on his lane and nobody is exploring.
    const onLane = Math.abs(me.y - WALK.row) < 0.6;
    const talk = inYear && onLane && this.wake < 0.05 ? talkAt(me.x) : null;
    this.setTalk(talk);

    const shot: Shot = { a, b: bw, f, cx: m.W / 2, cy: m.H / 2, z: 1, follow: 1, talking: talk?.who ?? null, explore: this.wake };
    const at = talk ? SPEAKER_AT[talk.who] : undefined;
    const leanTo = at ? { x: (at[0] - me.x) / 2, y: (at[1] - me.y) / 2 } : { x: 0, y: 0 };
    const k = Math.min(1, dt * 3);
    this.lean.x += (leanTo.x - this.lean.x) * k; this.lean.y += (leanTo.y - this.lean.y) * k;
    if (!exploring) {
      shot.walkTo = [b.u < 1 ? WALK.from : b.e > 0 ? WALK.to : walkGoal(b.y), WALK.row];
      // He turns to whoever is talking to him, and to the camera for the ending.
      if (b.e > 0) shot.faceWhenStill = "down";
      else if (at && talk?.who !== "rico") shot.faceWhenStill = faceTowards(at[0] - me.x, at[1] - me.y);
      else if (at) shot.faceWhenStill = "up";
      // A debug link that opens mid-story starts with Rico already where he should be, his line already said.
      if (this.forced !== null && !this.snapped) { shot.snap = true; this.snapped = true; this.talkStart = -1e3; }
    }

    if (this.soft) {
      // Reduce motion: the card stays the card, frame and all; no zooms. Rico still walks and the worlds still turn.
      this.setWindow(this.ghost, 1);
      world.setWindow(this.ghost);
      this.setTucked(false);
      this.paint(b.u, b.y, pos, 0);
      return shot;
    }

    // Camera: grow closes in on Rico; the year pulls back from him to the whole map; exploring leans back onto him.
    const wFit = m.vw / (m.W * m.T), hFit = m.vh / (m.H * m.T);
    const zFit = m.vw < m.vh ? Math.sqrt(wFit * hFit) : Math.min(wFit, hFit);
    if (b.u < 1) {
      shot.z = logLerp(1, PULL_CLOSE, b.g);
    } else {
      const pull = smoother(b.y);
      shot.z = logLerp(PULL_CLOSE, zFit, pull);
      shot.follow = lerp(1 - pull, 1, this.wake);
    }
    shot.ox = this.lean.x * (1 - this.wake); shot.oy = this.lean.y * (1 - this.wake);

    let win = lerpRect(this.ghost, full, b.g);
    let radius = 1 - b.g;
    if (b.e > 0) {
      // The ending: find Rico, then close in on his face, framed to one side of the polaroid.
      const layout = m.vw < m.vh ? FACE.tall : FACE.wide;
      const aim = smoother(b.e / 0.25);
      const zFace = Math.min(layout.h * m.vh, 0.55 * m.vw) / (HEAD.h * m.T);
      shot.z = logLerp(zFit, zFace, smoother((b.e - 0.05) / 0.4));
      shot.follow = aim;
      shot.ox = -(layout.fx - 0.5) * m.vw / (shot.z * m.T);
      shot.oy = HEAD.dy - (layout.fy - 0.5) * m.vh / (shot.z * m.T);
      shot.crisp = shot.z > 3;
      win = full; radius = 0;
      this.css("--hx", `${layout.fx * 100}%`);
      this.css("--hy", `${layout.fy * 100}%`);
    }

    this.setWindow(win, radius);
    world.setWindow(win);
    this.setTucked(!b.done);
    this.paint(b.u, b.y, pos, b.e);
    return shot;
  }

  /* ---------- the page around the map ---------- */
  private setTalk(talk: Talk | null) {
    if (talk !== this.talk) {
      this.say.classList.toggle("on", !!talk);
      if (talk) {
        const m = talk.who === "rico" ? this.squad.get("rico") : this.squad.get(talk.who);
        this.sayName.textContent = m?.name ?? talk.who;
        if (m?.face) this.sayFace.src = asset(m.face);
        this.sayFace.hidden = !m?.face;
        this.sayRest.textContent = talk.text;
        this.sayTyped.textContent = "";
        this.talkStart = this.snapped && this.time < 0.5 ? -1e3 : this.time;
        this.shownChars = 0;
      }
      this.talk = talk;
    }
    if (!talk) return;
    const shown = typed(talk.text, this.time - this.talkStart);
    if (shown.length !== this.shownChars) {
      this.shownChars = shown.length;
      this.sayTyped.textContent = shown;
      this.sayRest.textContent = talk.text.slice(shown.length);
      this.say.classList.toggle("done", shown.length === talk.text.length);
    }
  }
  private setWindow(r: Rect, radius: number) {
    const m = this.world?.metrics();
    const vw = m?.vw ?? this.pin.clientWidth, vh = m?.vh ?? this.pin.clientHeight;
    const rad = `${(14 * clamp01(radius)).toFixed(1)}px`;
    this.css("--wx", `${r.x.toFixed(1)}px`); this.css("--wy", `${r.y.toFixed(1)}px`);
    this.css("--ww", `${r.w.toFixed(1)}px`); this.css("--wh", `${r.h.toFixed(1)}px`);
    this.css("--wclip", `inset(${r.y.toFixed(1)}px ${(vw - r.x - r.w).toFixed(1)}px ${(vh - r.y - r.h).toFixed(1)}px ${r.x.toFixed(1)}px round ${rad})`);
    this.css("--wrad", rad);
    this.css("--wa", clamp01(radius).toFixed(3));
  }
  private css(name: string, value: string) {
    if (this.vars.get(name) === value) return;
    this.vars.set(name, value);
    this.stage.style.setProperty(name, value);
  }
  private setFilm(v: boolean) {
    if (v === this.film) return;
    this.film = v;
    document.body.classList.toggle("story-film", v);
    if (!v) { document.body.classList.remove("story-explore"); this.setTalk(null); }
  }
  private setTucked(v: boolean) {
    if (v === this.tucked) return;
    this.tucked = v;
    document.body.classList.toggle("story-tucked", v);
  }
  private paint(u: number, y: number, pos: number, e: number) {
    // The world's word, while it holds.
    const yearIn = clamp01((u - 0.8) / 0.25) * clamp01((7.1 - u) / 0.25);
    const idx = Math.round(pos) % N;
    if (this.word.textContent !== SEASONS[idx].word) this.word.textContent = SEASONS[idx].word;
    this.word.classList.toggle("dark", SEASONS[idx].light);
    const op = yearIn * wordOpacity(pos);
    this.css("--word", op.toFixed(3));
    this.css("--word-rise", `${((1 - op) * 10).toFixed(1)}px`);
    // The hairline, the skip button, the wander hint.
    this.css("--line", (clamp01((u - 0.8) / 0.2) * clamp01((7.3 - u) / 0.3)).toFixed(3));
    this.css("--line-fill", `${(y * 100).toFixed(2)}%`);
    this.skip.classList.toggle("on", u > 0.3 && u < 7.4);
    const cardOpen = !document.getElementById("card")?.hidden;
    this.css("--wander", (this.wake * (cardOpen ? 0 : 1)).toFixed(3));
    // The ending.
    const face = e > 0 && !this.soft;
    this.css("--vig", face ? (0.6 * smoother((e - 0.3) / 0.3)).toFixed(3) : "0");
    this.css("--pol", face ? smoother((e - 0.38) / 0.27).toFixed(3) : "0");
    this.css("--cap", face ? smoother((e - 0.6) / 0.2).toFixed(3) : "0");
  }
}

const lerpRect = (a: Rect, b: Rect, t: number): Rect =>
  ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
