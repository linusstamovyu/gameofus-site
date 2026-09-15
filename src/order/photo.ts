// Photos in the browser: read, resize and check the one photo per character. The rules are in photoRules.ts.
// Face detection and the body check are MediaPipe (Apache 2.0), self-hosted under /vendor and loaded only when
// the squad step opens. Both share one WASM runtime; the pose model (~5.8 MB) is the "lite" one.
import type { FaceDetector as MpFaceDetector, PoseLandmarker as MpPoseLandmarker } from "@mediapipe/tasks-vision";
import { headBoxFromPose, judgePhoto, laplacianVariance, meanBrightness, type Box, type FaceBox, type PoseLandmark, type Verdict } from "./photoRules";

export const MAX_LONG_SIDE = 2000;

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
  verdict: Verdict;
}

interface Detectors {
  face: MpFaceDetector | null;
  pose: MpPoseLandmarker | null;
}

let detectors: Promise<Detectors> | null = null;

/** Loads both detectors once. Either can come back null on a device that can't run it: that half is then checked by hand. */
function loadDetectors(): Promise<Detectors> {
  detectors ??= (async () => {
    try {
      const { FaceDetector, FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const base = new URL("vendor/mediapipe/", document.baseURI).href;
      const fileset = await FilesetResolver.forVisionTasks(`${base}wasm`);
      const [face, pose] = await Promise.all([
        FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: `${base}blaze_face_short_range.tflite` },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.5,
        }).catch(err => (console.warn("Face check unavailable on this device", err), null)),
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: `${base}pose_landmarker_lite.task` },
          runningMode: "IMAGE",
          numPoses: 3,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
        }).catch(err => (console.warn("Body check unavailable on this device", err), null)),
      ]);
      return { face, pose };
    } catch (err) {
      console.warn("Photo check unavailable on this device", err);
      return { face: null, pose: null };
    }
  })();
  return detectors;
}

/** Start loading the detectors early (on the squad step) so the first photo isn't slow. */
export function warmFaceDetector(): void {
  void loadDetectors();
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function detectFaces(det: MpFaceDetector, source: HTMLCanvasElement, dx = 0, dy = 0, scale = 1): FaceBox[] {
  return det.detect(source).detections.map(d => ({
    x: dx + (d.boundingBox?.originX ?? 0) / scale, y: dy + (d.boundingBox?.originY ?? 0) / scale,
    width: (d.boundingBox?.width ?? 0) / scale, height: (d.boundingBox?.height ?? 0) / scale,
    score: d.categories[0]?.score ?? 0,
  }));
}

/**
 * The face detector is a close-range model, so in a head-to-feet photo it can miss a small face. When the body
 * was found and no face overlaps its head, look again on a zoomed crop of the head.
 */
function facesFor(det: MpFaceDetector, big: HTMLCanvasElement, pose: PoseLandmark[] | null): FaceBox[] {
  const faces = detectFaces(det, big);
  const head = pose && headBoxFromPose(pose, big.width, big.height);
  if (!head || faces.some(f => f.score >= 0.6 && overlaps(f, head))) return faces;
  const side = Math.min(Math.max(head.width, head.height) * 3, big.width, big.height);
  const cx = head.x + head.width / 2, cy = head.y + head.height / 2;
  const x = Math.max(0, Math.min(big.width - side, cx - side / 2)), y = Math.max(0, Math.min(big.height - side, cy - side / 2));
  const scale = 320 / side;
  const [crop, ctx] = canvas(320, 320);
  ctx.drawImage(big, x, y, side, side, 0, 0, 320, 320);
  return [...faces, ...detectFaces(det, crop, x, y, scale).filter(f => !faces.some(g => overlaps(f, g)))];
}

/** Draws any image the browser can open onto a canvas no bigger than MAX_LONG_SIDE. */
async function toCanvas(file: Blob): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This browser can't open that photo. Try a JPEG or PNG (on iPhone: share it as 'Most compatible').");
  }
  const scale = Math.min(1, MAX_LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const [big, ctx] = canvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  ctx.drawImage(bitmap, 0, 0, big.width, big.height);
  bitmap.close();
  return big;
}

/** Check one canvas: detections, brightness and blur, then the verdict. */
async function check(big: HTMLCanvasElement): Promise<Verdict> {
  const { width, height } = big;
  // Brightness and blur are measured on a small copy: cheap, and blur shows up just as well.
  const sw = 320, sh = Math.max(3, Math.round((height / width) * sw));
  const [, smallCtx] = canvas(sw, sh);
  smallCtx.drawImage(big, 0, 0, sw, sh);
  const small = smallCtx.getImageData(0, 0, sw, sh).data;

  const det = await loadDetectors();
  let poses: PoseLandmark[][] | null = null;
  if (det.pose) {
    try {
      poses = det.pose.detect(big).landmarks.map(lms => lms.map(l => ({ x: l.x, y: l.y, visibility: l.visibility })));
    } catch (err) {
      console.warn("Body check failed on this photo", err);
    }
  }
  let faces: FaceBox[] | null = null;
  if (det.face) {
    try {
      faces = facesFor(det.face, big, poses?.length === 1 ? poses[0] : null);
    } catch (err) {
      console.warn("Face check failed on this photo", err);
    }
  }
  return judgePhoto({ width, height, faces, poses, brightness: meanBrightness(small), sharpness: laplacianVariance(small, sw, sh) });
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  const big = await toCanvas(file);
  const verdict = await check(big);
  const blob = await new Promise<Blob>((res, rej) => big.toBlob(b => (b ? res(b) : rej(new Error("Couldn't save the photo."))), "image/jpeg", 0.88));
  return { blob, width: big.width, height: big.height, verdict };
}

/** Re-run the check on a photo already stored on this device (drafts saved before the one-photo rule). */
export async function recheckStoredPhoto(blob: Blob): Promise<{ width: number; height: number; verdict: Verdict }> {
  const big = await toCanvas(blob);
  return { width: big.width, height: big.height, verdict: await check(big) };
}
