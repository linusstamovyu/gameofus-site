// Everything drawn on top of the ground: people, palms, parasols, signs, markers.
import type { Stop } from "../content/types";
import { hash } from "./map";
import type { Facing } from "./player";

/** Walk sheets are 9 cells: down, up, left (idle, step A, step B); right mirrors left. */
export function drawCharacter(ctx: CanvasRenderingContext2D, T: number, img: HTMLImageElement | undefined,
  px: number, py: number, facing: Facing, stepping: boolean, parity: number) {
  const base = { down: 0, up: 3, left: 6, right: 6 }[facing];
  const off = stepping ? (parity ? 1 : 2) : 0;
  ctx.fillStyle = "rgba(40,25,10,.22)";
  ctx.beginPath(); ctx.ellipse(px + T / 2, py + T * 0.9, T * 0.32, T * 0.12, 0, 0, 7); ctx.fill();
  if (!img?.complete || !img.naturalWidth) return;
  const fw = img.naturalWidth / 9;
  ctx.save();
  if (facing === "right") { ctx.translate(px + T, 0); ctx.scale(-1, 1); px = 0; }
  ctx.drawImage(img, (base + off) * fw, 0, fw, img.naturalHeight, px, py - T, T, T * 2);
  ctx.restore();
}

const PALM_HOLDS = [0.2, 0.4, 0.3, 0.2]; // the sway rests at the ends of its swing
const PALM_CYCLE = PALM_HOLDS.reduce((a, b) => a + b, 0);

export function drawPalm(ctx: CanvasRenderingContext2D, T: number, img: HTMLImageElement | undefined,
  x: number, y: number, time: number) {
  const cx = x * T + T / 2, by = (y + 1) * T;
  ctx.fillStyle = "rgba(40,25,10,.2)";
  ctx.beginPath(); ctx.ellipse(cx, by - T * 0.12, T * 0.5, T * 0.16, 0, 0, 7); ctx.fill();
  if (!img?.complete || !img.naturalWidth) return;
  const phase = (time + hash(x, y, 4) * PALM_CYCLE) % PALM_CYCLE;
  let frame = 0;
  for (let acc = 0; frame < 3; frame++) { acc += PALM_HOLDS[frame]; if (phase < acc) break; }
  const fw = img.naturalWidth / 4, w = T * 2.3, h = (w * img.naturalHeight) / fw;
  ctx.save();
  if (hash(x, y, 8) > 0.5) { ctx.translate(cx * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, frame * fw, 0, fw, img.naturalHeight, cx - w / 2, by - h, w, h);
  ctx.restore();
}

export function drawParasol(ctx: CanvasRenderingContext2D, T: number, x: number, y: number) {
  const cx = x * T + T / 2, by = (y + 1) * T, r = T * 0.62, cy = by - T * 1.4;
  ctx.fillStyle = "rgba(40,25,10,.18)";
  ctx.beginPath(); ctx.ellipse(cx + T * 0.15, by - T * 0.25, T * 0.62, T * 0.24, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#6d4a2b"; ctx.fillRect(cx - T * 0.04, by - T * 1.35, T * 0.08, T * 1.2);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#fbf3e4" : "#e0533d";
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4); ctx.closePath(); ctx.fill();
  }
}

export function drawSign(ctx: CanvasRenderingContext2D, T: number, s: Stop) {
  const px = s.x * T, by = (s.y + 1) * T;
  ctx.fillStyle = "#5b3a1f"; ctx.fillRect(px + T * 0.44, by - T * 0.8, T * 0.12, T * 0.7);
  ctx.fillStyle = "#4e2e17"; ctx.fillRect(px + T * 0.02, by - T * 1.28, T * 0.96, T * 0.56);
  ctx.fillStyle = "#9b6636"; ctx.fillRect(px + T * 0.07, by - T * 1.23, T * 0.86, T * 0.46);
  ctx.fillStyle = "#fdf6e3"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(T * 0.24)}px "Pixelify Sans", monospace`;
  ctx.fillText(s.label ?? "", px + T / 2, by - T * 0.99);
}

/** Teal diamond over a stop you have not read yet; a tick once you have. */
export function drawMarker(ctx: CanvasRenderingContext2D, T: number, s: Stop, visited: boolean, time: number) {
  const top = s.kind === "npc" ? s.y * T - T * 1.15 : s.y * T - T * 0.45;
  const bob = Math.sin(time * 4 + s.x) * T * 0.05, r = T * 0.17;
  ctx.save(); ctx.translate(s.x * T + T / 2, top + bob);
  if (visited) {
    ctx.fillStyle = "#fdf6e3"; ctx.strokeStyle = "#127269"; ctx.lineWidth = Math.max(2, T / 20);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(-r * 0.1, r * 0.35); ctx.lineTo(r * 0.5, -r * 0.35); ctx.stroke();
  } else {
    ctx.rotate(Math.PI / 4); ctx.fillStyle = "#1a9e95"; ctx.strokeStyle = "#fdf6e3"; ctx.lineWidth = Math.max(2, T / 22);
    ctx.fillRect(-r, -r, r * 2, r * 2); ctx.strokeRect(-r, -r, r * 2, r * 2);
  }
  ctx.restore();
}

export function drawTarget(ctx: CanvasRenderingContext2D, T: number, x: number, y: number, time: number) {
  const p = 0.5 + 0.5 * Math.sin(time * 6), r = T * (0.22 + 0.06 * p);
  ctx.save(); ctx.translate(x * T + T / 2, y * T + T / 2); ctx.scale(1, 0.55); ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = `rgba(26,158,149,${0.6 + 0.4 * p})`; ctx.lineWidth = Math.max(2, T / 14);
  ctx.strokeRect(-r, -r, r * 2, r * 2); ctx.restore();
}

export function drawPrompt(ctx: CanvasRenderingContext2D, T: number, label: string, tileX: number, tileY: number) {
  ctx.font = `700 ${Math.max(12, Math.round(T * 0.26))}px "Pixelify Sans", monospace`;
  const w = ctx.measureText(label).width + T * 0.4, h = T * 0.46;
  const cx = tileX * T + T / 2, y = tileY * T + T * 1.1;
  ctx.fillStyle = "rgba(32,36,44,.88)"; ctx.fillRect(cx - w / 2, y, w, h);
  ctx.fillStyle = "#fdf6e3"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, cx, y + h / 2);
}
