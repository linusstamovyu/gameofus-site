// World lab: one still frame of the whole map, so a theme can be screenshotted
// headless without walking anywhere. Dev-only page (world-lab.html).
import squadData from "./content/squad.json";
import stopsData from "./content/stops.json";
import type { SquadMember, Stop } from "./content/types";
import { asset } from "./dom";
import { drawCharacter, drawMarker } from "./world/draw";
import { H, PALMS, PARASOLS, PLAYER_START, W } from "./world/map";
import { OUTFITS } from "./world/outfits";
import { paintStaticLayer } from "./world/paint";
import { themeById } from "./world/themes";
import type { View } from "./world/themes/kit";

const q = new URLSearchParams(location.search);
const theme = themeById(q.get("world"));
const time = Number(q.get("t") ?? 1.5);
const T = Number(q.get("T") ?? 48);
const animated = q.get("lowpower") !== "1";
const squad = squadData as unknown as SquadMember[];
const stops = stopsData as unknown as Stop[];

const files = new Map<string, HTMLImageElement>();
const load = (key: string, file: string, url = asset(file)) =>
  new Promise<void>(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = url; files.set(key, i); });

async function main() {
  await Promise.all([
    ...squad.map(m => load(m.id, m.walk)),
    ...Object.entries(theme.files ?? {}).map(([k, f]) => load(`${theme.id}:${k}`, f)),
    ...Object.entries(OUTFITS[theme.id] ?? {}).map(([k, f]) => load(`walk:${k}`, f, f)),
    document.fonts?.ready,
  ]);
  const canvas = document.getElementById("lab") as HTMLCanvasElement;
  const vw = W * T, vh = H * T;
  canvas.width = vw; canvas.height = vh;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  const walk = (who: string) => { const d = files.get(`walk:${who}`); return d?.naturalWidth ? d : files.get(who); };
  const view: View = { x0: 0, y0: 0, x1: W - 1, y1: H - 1, cx: 0, cy: 0, vw, vh };

  ctx.fillStyle = theme.stageBg; ctx.fillRect(0, 0, vw, vh);
  ctx.drawImage(paintStaticLayer(theme, T, 1), 0, 0);
  theme.live?.(ctx, T, time, animated, view);
  const t = animated ? time : 0;
  const img = (key: string) => files.get(`${theme.id}:${key}`);
  const items: [number, () => void][] = [];
  PALMS.forEach(([x, y]) => items.push([y + 1, () => theme.tall(ctx, T, x, y, t, img)]));
  PARASOLS.forEach(([x, y]) => items.push([y + 1, () => theme.small(ctx, T, x, y, t)]));
  stops.forEach(s => items.push([s.y + 1, () => s.kind === "npc" && s.who
    ? drawCharacter(ctx, T, walk(s.who), s.x * T, s.y * T, "down", false, 0)
    : theme.sign(ctx, T, s)]));
  items.push([PLAYER_START[1] + 1.01, () => drawCharacter(ctx, T, walk("rico"), PLAYER_START[0] * T, PLAYER_START[1] * T, "down", false, 0)]);
  items.sort((a, b) => a[0] - b[0]).forEach(([, d]) => d());
  theme.grade?.(ctx, T, view);
  if (theme.lights) { ctx.save(); theme.lights(ctx, T, time, animated, view); ctx.restore(); }
  stops.forEach(s => drawMarker(ctx, T, s, false, time));
  if (theme.screen) { ctx.save(); theme.screen(ctx, vw, vh, time, animated); ctx.restore(); }
  document.title = "ready";
}
main();
