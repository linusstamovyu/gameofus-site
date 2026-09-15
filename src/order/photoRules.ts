// The photo check and the pixel preview, as pure functions over pixels (plan 07 Q4). photo.ts feeds them
// real images in the browser; tests feed them arrays. Nothing here ever sends a photo anywhere.
import type { CheckStatus, PhotoKind } from "./draft";

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export interface PhotoFacts {
  kind: PhotoKind;
  width: number;
  height: number;
  /** null when face detection couldn't run on this device: the check is advisory, never a blocker. */
  faces: FaceBox[] | null;
  /** Mean luma, 0–255. */
  brightness: number;
  /** Variance of the Laplacian on a small greyscale copy: low means blurry. */
  sharpness: number;
}

export interface Verdict {
  status: CheckStatus;
  note: string;
}

export const MIN_SIDE = 400;
export const FACE_SCORE = 0.6;
export const BLUR_LIMIT = 60;

/** What we tell the organiser about one photo. "fail" blocks the step; "warn" only advises. */
export function judgePhoto(f: PhotoFacts): Verdict {
  if (Math.min(f.width, f.height) < MIN_SIDE) return { status: "fail", note: `It's too small (${f.width}×${f.height}). Use a photo at least ${MIN_SIDE} pixels on its shortest side.` };
  const faces = f.faces?.filter(b => b.score >= FACE_SCORE) ?? null;
  if (f.kind === "face" && faces) {
    if (faces.length === 0) return { status: "fail", note: "We can't find a face. Use a clear close-up, facing the camera." };
    if (faces.length > 1) return { status: "fail", note: "There's more than one face. Crop it to just this friend." };
    if (faces[0].width < f.width * 0.18) return { status: "warn", note: "The face is quite small. A closer photo gives a better character." };
  }
  if ((f.kind === "body" || f.kind === "outfit") && faces && faces.length > 1) {
    return { status: "warn", note: "There's more than one person. We'll use the one in the middle unless you tell us otherwise." };
  }
  if (f.brightness < 55) return { status: "warn", note: "It's quite dark. A brighter photo helps us get the colours right." };
  if (f.brightness > 220) return { status: "warn", note: "It's very bright. Details may be washed out." };
  if (f.sharpness < BLUR_LIMIT) return { status: "warn", note: "It looks blurry. A sharper photo gives a better likeness." };
  if (faces === null && f.kind === "face") return { status: "unchecked", note: "Looks fine. We'll check the face by hand." };
  return { status: "ok", note: "Looks good." };
}

/** Mean luma of RGBA pixels. */
export function meanBrightness(rgba: Uint8ClampedArray): number {
  let sum = 0;
  const n = rgba.length / 4;
  for (let i = 0; i < rgba.length; i += 4) sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  return n ? sum / n : 0;
}

/** Variance of a 4-neighbour Laplacian over RGBA pixels: the standard cheap blur measure. */
export function laplacianVariance(rgba: Uint8ClampedArray, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  const g = new Float32Array(width * height);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) g[p] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  let sum = 0, sq = 0, n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const v = g[i - 1] + g[i + 1] + g[i - width] + g[i + width] - 4 * g[i];
      sum += v; sq += v * v; n++;
    }
  }
  const mean = sum / n;
  return sq / n - mean * mean;
}

/** The site's palette plus skin and hair tones: what a face is reduced to for the preview. */
export const PREVIEW_PALETTE: [number, number, number][] = [
  [32, 36, 44], [78, 46, 23], [122, 74, 38], [166, 112, 70], [211, 154, 74], [239, 220, 179], [253, 246, 227],
  [240, 196, 160], [224, 168, 128], [196, 132, 96], [150, 96, 66], [96, 62, 44], [60, 40, 30],
  [120, 120, 120], [26, 158, 149], [58, 143, 214], [224, 90, 155], [200, 60, 50],
];

/** Snap every opaque pixel to its nearest palette colour, in place. Returns the same array. */
export function quantise(rgba: Uint8ClampedArray, palette: [number, number, number][] = PREVIEW_PALETTE): Uint8ClampedArray {
  for (let i = 0; i < rgba.length; i += 4) {
    let best = 0, bestD = Infinity;
    for (let p = 0; p < palette.length; p++) {
      const dr = rgba[i] - palette[p][0], dg = rgba[i + 1] - palette[p][1], db = rgba[i + 2] - palette[p][2];
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db; // weighted towards how eyes see green
      if (d < bestD) { bestD = d; best = p; }
    }
    rgba[i] = palette[best][0]; rgba[i + 1] = palette[best][1]; rgba[i + 2] = palette[best][2];
  }
  return rgba;
}

/**
 * The square of the photo to use as the preview's face: the detected face grown to take in hair and chin,
 * or the upper middle of the photo when no face was found.
 */
export function faceCrop(width: number, height: number, face: FaceBox | null): { x: number; y: number; size: number } {
  if (!face) {
    const size = Math.round(Math.min(width, height) * 0.6);
    return { x: Math.round((width - size) / 2), y: Math.round(Math.max(0, height * 0.15)), size: Math.min(size, height) };
  }
  const size = Math.round(Math.min(Math.max(face.width, face.height) * 1.6, width, height));
  const cx = face.x + face.width / 2, cy = face.y + face.height * 0.42;
  const x = Math.round(Math.min(Math.max(0, cx - size / 2), width - size));
  const y = Math.round(Math.min(Math.max(0, cy - size / 2), height - size));
  return { x, y, size };
}
