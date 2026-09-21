/**
 * One moving preview per party minigame (owner, 20 Sep 2026: "add a hover creates animated loop of minigame").
 *
 * The nine big games carry a scripted loop drawn from the game's own art; the twelve minigames carried a still,
 * so the Party minigames tab was the one wall of dead photos on the page. Each scene here shows the ONE thing
 * that game asks you to do — the hole card turning over, the cups swapping, the light going green — in the
 * sandbox's own colours, so the loop and the game a click opens look like each other.
 *
 * Things that are the way they are for a reason:
 *  - THEY PLAY ON HOVER, not on screen (`onHover` in ../order/preview/loop). Twelve canvases drawing at once
 *    under a grid of stills is the case that rule was written against; on a phone, the same path plays one
 *    loop on a tap, which is why hover could be asked for without cutting phones out.
 *  - The card games draw the REAL DECK the site already ships (order-assets/card_*), so a preview of a card
 *    game is the cards the game deals. Everything else is drawn, because a die or a cup has no art to borrow.
 *  - Every scene is a pure function of t, and each one TELLS A LITTLE STORY that ends on its outcome — the
 *    dealer busting, the safe opening. So the two ends do not match, which is what the shared player asks of
 *    a loop, and left alone the wrap is a visible cut. Rather than give twelve scenes twelve wind-downs (and
 *    some, like a hand of cards, have no natural one), `scene()` dips every one of them to black at both
 *    ends: the frames at 0 and at `duration` are then the same blank ground BY CONSTRUCTION, and the wrap
 *    reads as the beat between two takes.
 */
import { orderAsset } from "../order/catalogue";
import { clamp01, smooth, type Scene } from "../order/steps/loops";

const W = 300, H = 200;
// The sandboxes' own palette, so the preview and the game a click opens are the same object.
const NIGHT = "#1b1f36", PANEL = "#f7f4e6", INK = "#23263a", PURPLE = "#7c5cd8", GOLD = "#f2c94c";
const GREEN = "#6fbf73", RED = "#e05a4e", FELT = "#2f7d5a", STEEL = "#8d94b0";
const FONT = '"Pixelify Sans","Trebuchet MS",sans-serif';

const card = (name: string) => orderAsset(`card_${name}.webp`);
const BACK = card("back");
const ease = (v: number) => smooth(clamp01(v));
/** A sawtooth 0..1 over [from, to] of the loop; 0 before, 1 after. */
const leg = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));

function panel(g: CanvasRenderingContext2D, x = 10, y = 10, w = W - 20, h = H - 20, r = 10): void {
  g.fillStyle = NIGHT; g.fillRect(0, 0, W, H);
  g.fillStyle = PANEL; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); g.stroke();
}
function label(g: CanvasRenderingContext2D, text: string, y = 34, color = INK, size = 17): void {
  g.fillStyle = color; g.font = `700 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, W / 2, y);
}
/** A card face-down or face-up at (cx, bottom-centre cy), scaled to height h, turned by `turn` in radians. */
function cardAt(g: CanvasRenderingContext2D, im: HTMLImageElement | null, cx: number, cy: number, h: number, squeeze = 1): void {
  const w = h * 0.69;
  if (!im) {
    g.fillStyle = "#e8e3d2"; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.roundRect(cx - (w * squeeze) / 2, cy - h / 2, w * squeeze, h, 4); g.fill(); g.stroke();
    return;
  }
  g.drawImage(im, cx - (w * squeeze) / 2, cy - h / 2, w * squeeze, h);
}
/** One pip face of a die, drawn in a box of side s centred on (cx, cy). */
function die(g: CanvasRenderingContext2D, value: number, cx: number, cy: number, s: number, tilt = 0): void {
  g.save(); g.translate(cx, cy); g.rotate(tilt);
  g.fillStyle = PANEL; g.strokeStyle = INK; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, s * 0.2); g.fill(); g.stroke();
  const p = s * 0.26, r = s * 0.075;
  const spots: Record<number, [number, number][]> = {
    1: [[0, 0]], 2: [[-p, -p], [p, p]], 3: [[-p, -p], [0, 0], [p, p]],
    4: [[-p, -p], [p, -p], [-p, p], [p, p]], 5: [[-p, -p], [p, -p], [0, 0], [-p, p], [p, p]],
    6: [[-p, -p], [p, -p], [-p, 0], [p, 0], [-p, p], [p, p]],
  };
  g.fillStyle = INK;
  for (const [x, y] of spots[value] ?? spots[1]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function grid(g: CanvasRenderingContext2D, cols: number, rows: number, x: number, y: number, cell: number, gap = 4): void {
  g.strokeStyle = "#cfc8b2"; g.lineWidth = 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    g.fillStyle = "#ece7d6";
    g.beginPath(); g.roundRect(x + c * (cell + gap), y + r * (cell + gap), cell, cell, 4); g.fill(); g.stroke();
  }
}

/** How long each end of a loop is spent dipped to black. */
export const LOOP_DIP = 0.34;
/** How much black is over the picture at time t: 1 at both ends of the loop, 0 anywhere in the middle. */
export const dipCover = (t: number, duration: number): number =>
  1 - Math.min(ease(t / LOOP_DIP), ease((duration - t) / LOOP_DIP));

const scene = (id: string, duration: number, label: string, images: string[], draw: Scene["draw"]): Scene => ({
  id: `mini-${id}`, w: W, h: H, duration, images, poster: orderAsset(`mini_${id}.webp`), label,
  draw(g, t, img) {
    draw(g, t, img);
    const cover = dipCover(t, duration);
    if (cover <= 0) return;
    g.globalAlpha = cover;
    g.fillStyle = NIGHT;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
  },
});

/* ---------------------------------------------------------------- Cards */

// Blackjack: the dealer's hole card turns over on 16 and he has to hit.
const blackjack = scene("blackjack", 5.2, "Blackjack: the dealer turns over his hole card and busts",
  [BACK, card("hearts_K"), card("spades_A"), card("hearts_6"), card("clubs_9")], (g, t, img) => {
    g.fillStyle = FELT; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 2;
    g.beginPath(); g.arc(W / 2, -30, 150, 0.35, Math.PI - 0.35); g.stroke();
    // Your hand: a King and an Ace, dealt in.
    const d1 = ease(leg(t, 0.2, 0.7)), d2 = ease(leg(t, 0.6, 1.1));
    cardAt(g, img(card("hearts_K")), 118 + 0 * d1, 150 - 60 * (1 - d1), 62);
    cardAt(g, img(card("spades_A")), 158, 150 - 60 * (1 - d2), 62);
    // The dealer: a six up, and the hole card that flips.
    cardAt(g, img(card("hearts_6")), 126, 56, 58);
    const flip = leg(t, 2.0, 2.7);
    const squeeze = Math.abs(Math.cos(Math.PI * ease(flip)));
    cardAt(g, img(flip < 0.5 ? BACK : card("clubs_9")), 166, 56, 58, Math.max(0.06, squeeze));
    g.fillStyle = PANEL; g.font = `700 15px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    // Clear of the card's own Play button, which sits over the bottom-left of every one of these.
    if (t > 1.2) g.fillText("21", 216, 172);
    if (t > 2.9) { g.fillStyle = GOLD; g.fillText(t > 3.6 ? "DEALER BUSTS" : "15…", W / 2, 20); }
  });

// King's Cup: the ring is drawn round the cup and one card comes up a King.
const kingsCup = scene("kings-cup", 4.6, "King's Cup: a card is drawn from the ring and it is a King",
  [BACK, card("hearts_K")], (g, t, img) => {
    panel(g);
    label(g, "KING'S CUP", 30, PURPLE, 15);
    const cx = W / 2, cy = 118, R = 58;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      if (i === 3 && t > 0.9) continue; // the one being drawn
      g.save(); g.translate(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.rotate(a + Math.PI / 2);
      cardAt(g, img(BACK), 0, 0, 30); g.restore();
    }
    // The cup in the middle.
    g.fillStyle = GOLD; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(cx - 15, cy - 16); g.lineTo(cx + 15, cy - 16); g.lineTo(cx + 10, cy + 18); g.lineTo(cx - 10, cy + 18);
    g.closePath(); g.fill(); g.stroke();
    // The draw: it lifts out of the ring and turns over.
    const lift = ease(leg(t, 0.9, 1.9));
    const a3 = (3 / 12) * Math.PI * 2 - Math.PI / 2;
    const fx = cx + Math.cos(a3) * R, fy = cy + Math.sin(a3) * R;
    const x = fx + (cx - fx) * lift, y = fy + (cy - 30 - fy) * lift;
    const flip = leg(t, 1.9, 2.6);
    cardAt(g, img(flip < 0.5 ? BACK : card("hearts_K")), x, y, 30 + 26 * lift, Math.max(0.06, Math.abs(Math.cos(Math.PI * ease(flip)))));
    if (t > 2.8) label(g, "EVERYONE POURS", 178, PURPLE, 14);
  });

// The Bus: the pyramid is turned over a row at a time, bottom first.
const theBus = scene("the-bus", 5.4, "The Bus: the pyramid turns over one row at a time",
  [BACK, card("clubs_8"), card("diamonds_7"), card("spades_10")], (g, t, img) => {
    panel(g);
    label(g, "THE BUS", 28, PURPLE, 15);
    const faces = [card("clubs_8"), card("diamonds_7"), card("spades_10")];
    for (let row = 0; row < 4; row++) {
      const n = 4 - row, turned = leg(t, 0.8 + row * 1.0, 1.5 + row * 1.0);
      for (let i = 0; i < n; i++) {
        // The rows step by a little less than a card's height: a pyramid overlaps, but only at the edges.
        const x = W / 2 + (i - (n - 1) / 2) * 40, y = 62 + row * 31;
        const sq = Math.max(0.06, Math.abs(Math.cos(Math.PI * ease(turned))));
        cardAt(g, img(turned < 0.5 ? BACK : faces[(row + i) % faces.length]), x, y, 42, sq);
      }
    }
    if (t > 4.4) label(g, "DRINK OR PASS", 182, RED, 13);
  });

/* ---------------------------------------------------------------- Dice & luck */

const pushYourLuck = scene("dice-push-your-luck", 4.8, "Push Your Luck: the dice are rolled, banked, then busted", [], (g, t) => {
  panel(g);
  label(g, "PUSH YOUR LUCK", 30, PURPLE, 15);
  // Two rolls: the first banks, the second busts.
  const roll = t < 2.4 ? leg(t, 0.3, 1.2) : leg(t, 2.7, 3.6);
  const settled = roll >= 1;
  const spin = settled ? 0 : (1 - roll) * 0.9;
  const shown = t < 2.4 ? [5, 3] : [1, 1];
  const wobble = settled ? 0 : Math.sin(t * 40) * 6 * (1 - roll);
  die(g, settled ? shown[0] : 1 + (Math.floor(t * 21) % 6), 118, 108 + wobble, 40, spin * Math.sin(t * 18));
  die(g, settled ? shown[1] : 1 + (Math.floor(t * 17) % 6), 182, 108 - wobble, 40, -spin * Math.cos(t * 15));
  // The bank bar.
  const score = t < 2.4 ? 0.22 + 0.4 * ease(leg(t, 1.2, 1.8)) : 0.62;
  g.fillStyle = "#e3ddc8"; g.beginPath(); g.roundRect(40, 158, 220, 12, 6); g.fill();
  g.fillStyle = t > 3.7 ? RED : GREEN; g.beginPath(); g.roundRect(40, 158, 220 * score, 12, 6); g.fill();
  if (t > 1.9 && t < 2.5) label(g, "BANKED", 146, GREEN, 15);
  if (t > 3.7) label(g, "BUST", 146, RED, 17);
});

const cupShuffle = scene("three-cup-shuffle", 4.4, "Three-Cup Shuffle: the cups swap and one is lifted", [], (g, t) => {
  panel(g);
  label(g, "THREE-CUP SHUFFLE", 30, PURPLE, 14);
  const xs = [90, 150, 210];
  // Two swaps, then the middle cup lifts off the ball.
  const s1 = ease(leg(t, 0.5, 1.4)), s2 = ease(leg(t, 1.5, 2.4));
  const pos = [0, 1, 2].map(i => {
    let x = xs[i];
    if (i === 0) x = xs[0] + (xs[1] - xs[0]) * s1;
    if (i === 1) x = xs[1] + (xs[0] - xs[1]) * s1;
    if (i === 1) x += (xs[2] - xs[0]) * s2;
    if (i === 2) x = xs[2] + (xs[1] - xs[2]) * s2;
    return x;
  });
  const arc = (k: number) => -Math.sin(Math.PI * k) * 16;
  const lift = ease(leg(t, 2.7, 3.3)) * (1 - ease(leg(t, 4.0, 4.4)));
  // The ball, under the cup that ends up in the middle.
  g.fillStyle = RED; g.beginPath(); g.arc(xs[1], 138, 9, 0, Math.PI * 2); g.fill();
  [0, 1, 2].forEach(i => {
    const y = 120 + (i === 1 ? -34 * lift : 0) + (i === 0 || i === 1 ? arc(s1) : 0) + (i === 1 || i === 2 ? arc(s2) : 0);
    g.fillStyle = i === 1 ? "#d7452f" : "#c0392b"; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(pos[i] - 22, y + 24); g.lineTo(pos[i] - 15, y - 20); g.lineTo(pos[i] + 15, y - 20); g.lineTo(pos[i] + 22, y + 24);
    g.closePath(); g.fill(); g.stroke();
  });
  if (t > 3.4 && t < 4.1) label(g, "FOUND IT", 60, GREEN, 15);
});

const landmine = scene("landmine", 4.6, "Landmine: safe tiles turn over until one is a mine", [], (g, t) => {
  panel(g);
  label(g, "LANDMINE", 28, PURPLE, 15);
  const cell = 30, gap = 5, x0 = W / 2 - (5 * cell + 4 * gap) / 2, y0 = 52;
  grid(g, 5, 3, x0, y0, cell, gap);
  const picks: [number, number, string][] = [[1, 0, "2"], [2, 1, "1"], [3, 1, "3"], [1, 2, "*"]];
  picks.forEach(([c, r, face], i) => {
    const on = leg(t, 0.6 + i * 0.8, 1.0 + i * 0.8);
    if (on <= 0) return;
    const x = x0 + c * (cell + gap), y = y0 + r * (cell + gap);
    const mine = face === "*";
    g.globalAlpha = ease(on);
    g.fillStyle = mine ? RED : "#fffdf5"; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, y, cell, cell, 4); g.fill(); g.stroke();
    g.fillStyle = mine ? PANEL : PURPLE; g.font = `700 16px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(mine ? "✹" : face, x + cell / 2, y + cell / 2 + 1);
    g.globalAlpha = 1;
  });
  if (t > 3.9) label(g, "BOOM", 168, RED, 18);
});

/* ---------------------------------------------------------------- Reflex */

const reactionLight = scene("reaction-light", 4.2, "Reaction Light: red, a decoy, then green and a tap", [], (g, t) => {
  panel(g);
  const decoy = t > 1.0 && t < 1.45;
  const go = t > 2.1;
  const hit = t > 2.42;
  label(g, hit ? "0.32s" : go ? "NOW!" : decoy ? "WAIT…" : "READY", 34, hit ? GREEN : go ? GREEN : decoy ? GOLD : INK, 17);
  const r = 42 + (hit ? Math.max(0, 4 - (t - 2.42) * 24) : 0);
  g.fillStyle = go ? GREEN : decoy ? GOLD : RED;
  g.strokeStyle = INK; g.lineWidth = 4;
  g.beginPath(); g.arc(W / 2, 118, r, 0, Math.PI * 2); g.fill(); g.stroke();
  if (hit) {
    const k = clamp01((t - 2.42) / 1.2);
    g.globalAlpha = 1 - k; g.strokeStyle = GREEN; g.lineWidth = 3;
    g.beginPath(); g.arc(W / 2, 118, r + 12 + k * 34, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  }
});

const stopThePour = scene("stop-the-pour", 4.4, "Stop the Pour: the glass fills and is stopped inside the band", [], (g, t) => {
  panel(g);
  label(g, "STOP THE POUR", 30, PURPLE, 15);
  const gx = W / 2 - 30, gy = 56, gw = 60, gh = 104;
  // The target band.
  g.fillStyle = "rgba(111,191,115,.35)"; g.fillRect(gx - 6, gy + gh * 0.24, gw + 12, gh * 0.16);
  const stopped = t > 2.6;
  const fill = stopped ? 0.68 : clamp01(leg(t, 0.4, 2.6)) * 0.68;
  g.fillStyle = GOLD; g.fillRect(gx + 3, gy + gh - gh * fill, gw - 6, gh * fill);
  g.strokeStyle = INK; g.lineWidth = 3;
  g.strokeRect(gx, gy, gw, gh);
  // The pour, until it is stopped.
  if (!stopped) { g.fillStyle = GOLD; g.fillRect(W / 2 - 3, 40, 6, gy + gh - gh * fill - 40); }
  if (stopped) label(g, "PERFECT POUR", 178, GREEN, 15);
});

const safecracker = scene("safecracker", 4.6, "Safecracker: the dial turns, clicks in, and the bolt slides", [], (g, t) => {
  panel(g);
  label(g, "SAFECRACKER", 28, PURPLE, 15);
  const cx = W / 2, cy = 112, R = 42;
  const spin = ease(leg(t, 0.3, 2.2)) * Math.PI * 2.6 + ease(leg(t, 2.4, 3.0)) * 0.6;
  g.fillStyle = STEEL; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill(); g.stroke();
  g.save(); g.translate(cx, cy); g.rotate(spin);
  g.strokeStyle = INK; g.lineWidth = 2;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * (R - 9), Math.sin(a) * (R - 9)); g.lineTo(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2)); g.stroke(); }
  g.fillStyle = PANEL; g.beginPath(); g.roundRect(-4, -R + 2, 8, 16, 3); g.fill(); g.stroke();
  g.restore();
  // The bolt, once it is cracked.
  const open = ease(leg(t, 3.2, 3.9));
  g.fillStyle = open > 0 ? GREEN : STEEL; g.strokeStyle = INK; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(228 - 30 * open, cy - 9, 34, 18, 4); g.fill(); g.stroke();
  if (t > 3.9) label(g, "CRACKED", 176, GREEN, 15);
});

/* ---------------------------------------------------------------- Strategy */

const battleships = scene("mini-battleships", 4.8, "Mini Battleships: a miss, then a hit", [], (g, t) => {
  panel(g);
  label(g, "MINI BATTLESHIPS", 28, PURPLE, 14);
  const cell = 26, gap = 4, x0 = W / 2 - (5 * cell + 4 * gap) / 2, y0 = 52;
  grid(g, 5, 4, x0, y0, cell, gap);
  const at = (c: number, r: number) => [x0 + c * (cell + gap) + cell / 2, y0 + r * (cell + gap) + cell / 2] as const;
  const shots: [number, number, boolean][] = [[1, 1, false], [3, 2, true]];
  shots.forEach(([c, r, isHit], i) => {
    const on = leg(t, 0.6 + i * 1.5, 1.1 + i * 1.5);
    if (on <= 0) return;
    const [x, y] = at(c, r);
    g.globalAlpha = ease(on);
    g.fillStyle = isHit ? RED : "#aeb6c8";
    g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  });
  // The crosshair travelling between the two shots.
  const k = ease(leg(t, 1.2, 2.1));
  const [ax, ay] = at(1, 1), [bx, by] = at(3, 2);
  const cx = ax + (bx - ax) * k, cy = ay + (by - ay) * k;
  g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.moveTo(cx - 15, cy); g.lineTo(cx + 15, cy); g.moveTo(cx, cy - 15); g.lineTo(cx, cy + 15); g.stroke();
  if (t > 2.4) label(g, "HIT", 178, RED, 16);
});

const nim = scene("takeaway-nim", 4.6, "Takeaway Nim: sticks are taken until the last one is left", [], (g, t) => {
  panel(g);
  label(g, "TAKEAWAY NIM", 30, PURPLE, 15);
  const total = 9;
  const taken = [0, 2, 3, 5, 6, 8].map((_, i) => 0.7 + i * 0.55); // when each stick goes
  for (let i = 0; i < total; i++) {
    const when = taken[[0, 2, 3, 5, 6, 8].indexOf(i)];
    const gone = when === undefined ? 0 : ease(leg(t, when, when + 0.28));
    if (gone >= 1) continue;
    const x = 48 + i * 25, h = 54;
    g.globalAlpha = 1 - gone;
    g.fillStyle = i === 4 ? GOLD : "#c8a06a"; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x - 5, 92 - h / 2 - gone * 18, 10, h, 4); g.fill(); g.stroke();
    g.globalAlpha = 1;
  }
  if (t > 3.9) label(g, "TAKE THE LAST ONE", 168, PURPLE, 14);
});

const ticTacToe = scene("tic-tac-toe", 5.0, "Tic-Tac-Toe: the board fills and a line wins it", [], (g, t) => {
  panel(g);
  const s = 36, x0 = W / 2 - s * 1.5, y0 = 46;
  g.strokeStyle = INK; g.lineWidth = 3;
  for (let i = 1; i < 3; i++) {
    g.beginPath(); g.moveTo(x0 + i * s, y0); g.lineTo(x0 + i * s, y0 + s * 3); g.stroke();
    g.beginPath(); g.moveTo(x0, y0 + i * s); g.lineTo(x0 + s * 3, y0 + i * s); g.stroke();
  }
  const moves: [number, number, "x" | "o"][] = [[0, 0, "x"], [1, 1, "o"], [0, 1, "x"], [2, 2, "o"], [0, 2, "x"]];
  moves.forEach(([c, r, who], i) => {
    const on = ease(leg(t, 0.5 + i * 0.6, 0.85 + i * 0.6));
    if (on <= 0) return;
    const cx = x0 + c * s + s / 2, cy = y0 + r * s + s / 2, q = 11 * on;
    g.lineWidth = 4; g.strokeStyle = who === "x" ? PURPLE : GOLD;
    if (who === "x") { g.beginPath(); g.moveTo(cx - q, cy - q); g.lineTo(cx + q, cy + q); g.moveTo(cx + q, cy - q); g.lineTo(cx - q, cy + q); g.stroke(); }
    else { g.beginPath(); g.arc(cx, cy, q, 0, Math.PI * 2); g.stroke(); }
  });
  const win = ease(leg(t, 3.7, 4.3));
  if (win > 0) {
    g.strokeStyle = RED; g.lineWidth = 5; g.lineCap = "round";
    const cx = x0 + s / 2;
    g.beginPath(); g.moveTo(cx, y0 + 8); g.lineTo(cx, y0 + 8 + (s * 3 - 16) * win); g.stroke();
    g.lineCap = "butt";
  }
});

/** Every party minigame, keyed by the id the catalogue uses. A game with no entry keeps its still. */
export const MINIGAME_LOOPS: Record<string, () => Scene> = {
  blackjack: () => blackjack,
  "kings-cup": () => kingsCup,
  "the-bus": () => theBus,
  "dice-push-your-luck": () => pushYourLuck,
  "three-cup-shuffle": () => cupShuffle,
  landmine: () => landmine,
  "reaction-light": () => reactionLight,
  "stop-the-pour": () => stopThePour,
  safecracker: () => safecracker,
  "mini-battleships": () => battleships,
  "takeaway-nim": () => nim,
  "tic-tac-toe": () => ticTacToe,
};
