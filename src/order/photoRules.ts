// The photo check, as pure functions over detections and pixels (plan 07 Q4). photo.ts feeds them real
// images in the browser; tests feed them arrays. Nothing here ever sends a photo anywhere.
//
// One photo per character (owner, 15 Sep 2026): it only passes if it shows ONE person, with a clear face AND
// the whole body from head to feet. The two boxes the squad step shows ("Full body" and "Face") are crops of
// that one photo, worked out here as numbers.
import type { CheckStatus } from "./draft";

/** A rectangle in the photo's own pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceBox extends Box {
  score: number;
}

/** One MediaPipe pose landmark: x and y are 0..1 across the photo, visibility 0..1. */
export interface PoseLandmark {
  x: number;
  y: number;
  visibility?: number;
}

export interface PhotoFacts {
  width: number;
  height: number;
  /** null when face detection couldn't run on this device: that half of the check is then done by hand. */
  faces: FaceBox[] | null;
  /** One array of 33 landmarks per person found; null when the body check couldn't run on this device. */
  poses: PoseLandmark[][] | null;
  /** Mean luma, 0–255. */
  brightness: number;
  /** Variance of the Laplacian on a small greyscale copy: low means blurry. */
  sharpness: number;
}

export interface Verdict {
  status: CheckStatus;
  note: string;
  /** The face to show in the "Face" box (null when none was found). */
  face: FaceBox | null;
  /** The person to show in the "Full body" box (null when no body was found). */
  body: Box | null;
}

export const MIN_SIDE = 400;
export const FACE_SCORE = 0.6;
export const BLUR_LIMIT = 60;
/** A landmark counts as seen at this visibility or above. */
export const LANDMARK_VISIBLE = 0.5;
/** A face narrower than this many pixels is too small to draw a likeness from. */
export const MIN_FACE_PX = 40;
/** A face away from the person's head only counts as a second person when it is this clear… */
export const SECOND_FACE_SCORE = 0.75;
/** …and at least this big next to the main face (a stranger far in the background doesn't fail the photo). */
export const SECOND_FACE_SIZE = 0.4;

/** MediaPipe's pose landmark indices, for the parts the check needs. */
export const LM = {
  nose: 0, leftEyeOuter: 3, rightEyeOuter: 6, leftEar: 7, rightEar: 8,
  leftShoulder: 11, rightShoulder: 12, leftHip: 23, rightHip: 24,
  leftAnkle: 27, rightAnkle: 28, leftHeel: 29, rightHeel: 30, leftFoot: 31, rightFoot: 32,
} as const;

/**
 * Seen and inside the photo. The model guesses parts that are out of shot and places them ON or just past the edge
 * (a cropped-off ankle comes back at y 1.003 with visibility 0.65, measured), so the edge itself doesn't count.
 */
export function landmarkSeen(p: PoseLandmark | undefined): boolean {
  if (!p) return false;
  const inside = p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y < 1;
  return inside && (p.visibility ?? 1) >= LANDMARK_VISIBLE;
}

const seenAny = (pose: PoseLandmark[], ...idx: number[]) => idx.some(i => landmarkSeen(pose[i]));

/** The first part of a head-to-feet view that's missing, top down; null when the whole body is in the shot. */
export function missingBodyPart(pose: PoseLandmark[]): "head" | "shoulders" | "hips" | "feet" | null {
  if (!seenAny(pose, LM.nose)) return "head";
  if (!seenAny(pose, LM.leftShoulder, LM.rightShoulder)) return "shoulders";
  if (!seenAny(pose, LM.leftHip, LM.rightHip)) return "hips";
  // Feet: an ankle AND its heel or toes on the same side, so a crop through the ankle still reads as no feet.
  const foot = (ankle: number, heel: number, toes: number) => landmarkSeen(pose[ankle]) && seenAny(pose, heel, toes);
  if (!foot(LM.leftAnkle, LM.leftHeel, LM.leftFoot) && !foot(LM.rightAnkle, LM.rightHeel, LM.rightFoot)) return "feet";
  return null;
}

const MISSING_NOTE: Record<NonNullable<ReturnType<typeof missingBodyPart>>, string> = {
  head: "We can't see their head. Use a photo that shows them from head to feet.",
  shoulders: "We can't see their shoulders. Use a photo that shows them from head to feet.",
  hips: "We can't see their whole body. Step back so everything from head to feet is in the shot.",
  feet: "We can't see feet. Step back so the whole body is in the shot.",
};

const people = (n: number) => (n === 2 ? "Two people" : `${n} people`);

/**
 * What we tell the organiser about the one photo. "fail" blocks the step; "warn" only advises; "unchecked" means a
 * detector couldn't run on this device, so we check that half by hand (never a blocker).
 */
export function judgePhoto(f: PhotoFacts): Verdict {
  const clear = f.faces?.filter(b => b.score >= FACE_SCORE) ?? null;
  const poses = f.poses;
  const pose = poses?.length === 1 ? poses[0] : null;
  // With a body found, only a face on its head is THEIR face: the detector also scores guitars and patterned shirts
  // around 0.6 (measured). Faces elsewhere count only as a second person, and only when clear and big enough.
  const head = pose && headBoxFromPose(pose, f.width, f.height);
  const onHead = clear && head ? clear.filter(b => overlaps(b, grow(head, 1))) : clear;
  const faces = onHead;
  const face = faces ? pickFace(faces, pose, f.width, f.height) : null;
  const strangers = clear && faces ? clear.filter(b => !faces.includes(b) && b.score >= SECOND_FACE_SCORE && (!face || b.width >= face.width * SECOND_FACE_SIZE)).length : 0;
  const body = pose ? bodyBox(pose, f.width, f.height, face) : null;
  const out = (status: CheckStatus, note: string): Verdict => ({ status, note, face, body });

  if (Math.min(f.width, f.height) < MIN_SIDE) return out("fail", `It's too small (${f.width}×${f.height}). Use a photo at least ${MIN_SIDE} pixels on its shortest side.`);
  const count = Math.max((faces?.length ?? 0) + strangers, poses?.length ?? 0);
  if (count > 1) return out("fail", `${people(count)} in this photo. Use one where they're on their own.`);
  if (poses && poses.length === 0) {
    return out("fail", faces?.length ? "We can only see a face. Use a photo that shows them from head to feet." : "We can't see anyone. Use a photo of them standing, from head to feet.");
  }
  if (pose) {
    const missing = missingBodyPart(pose);
    if (missing) return out("fail", MISSING_NOTE[missing]);
  }
  if (faces && faces.length === 0) return out("fail", "No face found. Use a photo where their face is clear and turned towards the camera.");
  if (face && face.width < MIN_FACE_PX) return out("warn", "Their face is very small. A sharper photo, or one a little closer, gives a better likeness.");
  if (f.brightness < 55) return out("warn", "It's quite dark. A brighter photo helps us get the colours right.");
  if (f.brightness > 220) return out("warn", "It's very bright. Details may be washed out.");
  if (f.sharpness < BLUR_LIMIT) return out("warn", "It looks blurry. A sharper photo gives a better likeness.");
  if (faces === null && poses === null) return out("unchecked", "Looks fine. We'll check the face and full body by hand.");
  if (faces === null) return out("unchecked", "Full body looks good. We'll check the face by hand.");
  if (poses === null) return out("unchecked", "Face looks good. We'll check the full body by hand.");
  return out("ok", "Looks good: one face, head to feet.");
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** A box grown by `k` of its own size on every side. */
const grow = (b: Box, k: number): Box => ({ x: b.x - b.width * k, y: b.y - b.height * k, width: b.width * (1 + 2 * k), height: b.height * (1 + 2 * k) });

/** The face that belongs to the body when there is one (nearest the nose), else the biggest. */
export function pickFace(faces: FaceBox[], pose: PoseLandmark[] | null, width: number, height: number): FaceBox | null {
  if (!faces.length) return null;
  const nose = pose?.[LM.nose];
  if (nose && landmarkSeen(nose)) {
    const nx = nose.x * width, ny = nose.y * height;
    const dist = (b: FaceBox) => Math.hypot(b.x + b.width / 2 - nx, b.y + b.height / 2 - ny);
    return [...faces].sort((a, b) => dist(a) - dist(b))[0];
  }
  return [...faces].sort((a, b) => b.width - a.width)[0];
}

const clampBox = (x0: number, y0: number, x1: number, y1: number, width: number, height: number): Box => {
  const x = Math.max(0, Math.floor(x0)), y = Math.max(0, Math.floor(y0));
  return { x, y, width: Math.min(width, Math.ceil(x1)) - x, height: Math.min(height, Math.ceil(y1)) - y };
};

/**
 * The person, head to feet, in photo pixels: every landmark we can see, plus the face, grown to take in the top of
 * the head (the pose has no crown landmark) and a little room round the edges. Always inside the photo.
 */
export function bodyBox(pose: PoseLandmark[], width: number, height: number, face: Box | null): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pose) {
    if (!p || (p.visibility ?? 1) < 0.3) continue;
    const px = Math.min(1, Math.max(0, p.x)) * width, py = Math.min(1, Math.max(0, p.y)) * height;
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, width, height };
  // The crown sits about one nose-to-shoulders drop above the nose.
  const nose = pose[LM.nose], ls = pose[LM.leftShoulder], rs = pose[LM.rightShoulder];
  if (nose && ls && rs) y0 = Math.min(y0, (nose.y - Math.abs((ls.y + rs.y) / 2 - nose.y) * 0.9) * height);
  if (face) {
    x0 = Math.min(x0, face.x); x1 = Math.max(x1, face.x + face.width);
    y0 = Math.min(y0, face.y - face.height * 0.35); y1 = Math.max(y1, face.y + face.height);
  }
  const pad = Math.max(8, (y1 - y0) * 0.05);
  return clampBox(x0 - pad, y0 - pad, x1 + pad, y1 + pad, width, height);
}

/** A face box from the head landmarks, for when the face detector couldn't run (or missed a small face). */
export function headBoxFromPose(pose: PoseLandmark[], width: number, height: number): Box | null {
  const head = [LM.nose, LM.leftEyeOuter, LM.rightEyeOuter, LM.leftEar, LM.rightEar].map(i => pose[i]).filter(landmarkSeen);
  if (!head.length) return null;
  const xs = head.map(p => p.x * width), ys = head.map(p => p.y * height);
  const ls = pose[LM.leftShoulder], rs = pose[LM.rightShoulder];
  const shoulderSpan = ls && rs ? Math.abs(ls.x - rs.x) * width : 0;
  const size = Math.max(Math.max(...xs) - Math.min(...xs), shoulderSpan * 0.5, 24);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return clampBox(cx - size / 2, cy - size * 0.55, cx + size / 2, cy + size * 0.45, width, height);
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

/**
 * The square of the photo to show in the "Face" box: the detected face grown to take in hair and chin, or the
 * upper middle of the photo when no face was found. Always inside the photo.
 */
export function faceCrop(width: number, height: number, face: Box | null): { x: number; y: number; size: number } {
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
