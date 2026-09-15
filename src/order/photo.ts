// Photos in the browser: read, resize, check and make the pixel preview. The rules are in photoRules.ts.
// Face detection is MediaPipe, self-hosted under /vendor and loaded only the first time a photo is added.
import type { FaceDetector as MpFaceDetector } from "@mediapipe/tasks-vision";
import type { PhotoKind } from "./draft";
import { faceCrop, judgePhoto, laplacianVariance, meanBrightness, quantise, type FaceBox, type Verdict } from "./photoRules";

export const MAX_LONG_SIDE = 2000;

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
  verdict: Verdict;
  /** A small pixel-art preview PNG (data URL), made for face photos only. */
  preview?: string;
  face: FaceBox | null;
}

let detector: Promise<MpFaceDetector | null> | null = null;

/** Loads the detector once. Resolves null on any failure: the check then says "we'll check it by hand". */
function faceDetector(): Promise<MpFaceDetector | null> {
  detector ??= (async () => {
    try {
      const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const base = new URL("vendor/mediapipe/", document.baseURI).href;
      const fileset = await FilesetResolver.forVisionTasks(`${base}wasm`);
      return await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${base}blaze_face_short_range.tflite` },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.5,
      });
    } catch (err) {
      console.warn("Face check unavailable on this device", err);
      return null;
    }
  })();
  return detector;
}

/** Start loading the detector early (on the squad step) so the first photo isn't slow. */
export function warmFaceDetector(): void {
  void faceDetector();
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
}

export async function processPhoto(file: File, kind: PhotoKind, shirt: string): Promise<ProcessedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This browser can't open that photo. Try a JPEG or PNG (on iPhone: share it as 'Most compatible').");
  }
  const scale = Math.min(1, MAX_LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
  const [big, bigCtx] = canvas(width, height);
  bigCtx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Brightness and blur are measured on a small copy: cheap, and blur shows up just as well.
  const sw = 320, sh = Math.max(3, Math.round((height / width) * sw));
  const [, smallCtx] = canvas(sw, sh);
  smallCtx.drawImage(big, 0, 0, sw, sh);
  const small = smallCtx.getImageData(0, 0, sw, sh).data;

  const det = await faceDetector();
  let faces: FaceBox[] | null = null;
  if (det) {
    try {
      faces = det.detect(big).detections.map(d => ({
        x: d.boundingBox?.originX ?? 0, y: d.boundingBox?.originY ?? 0,
        width: d.boundingBox?.width ?? 0, height: d.boundingBox?.height ?? 0,
        score: d.categories[0]?.score ?? 0,
      }));
    } catch (err) {
      console.warn("Face check failed on this photo", err);
    }
  }
  const verdict = judgePhoto({ kind, width, height, faces, brightness: meanBrightness(small), sharpness: laplacianVariance(small, sw, sh) });
  const blob = await new Promise<Blob>((res, rej) => big.toBlob(b => (b ? res(b) : rej(new Error("Couldn't save the photo."))), "image/jpeg", 0.88));
  const best = faces?.filter(f => f.score >= 0.6).sort((a, b) => b.width - a.width)[0] ?? null;
  return { blob, width, height, verdict, face: best, preview: kind === "face" ? pixelPreview(big, best, shirt) : undefined };
}

/**
 * The "you as a character" moment: the face reduced to 14×14 pixels in the game palette, on a template body
 * in the friend's shirt colour. Clearly a preview, not final art (the page labels it so).
 */
export function pixelPreview(source: CanvasImageSource & { width: number; height: number }, face: FaceBox | null, shirt: string): string {
  const crop = faceCrop(source.width, source.height, face);
  const [faceC, faceCtx] = canvas(14, 14);
  faceCtx.imageSmoothingQuality = "high";
  faceCtx.drawImage(source, crop.x, crop.y, crop.size, crop.size, 0, 0, 14, 14);
  const px = faceCtx.getImageData(0, 0, 14, 14);
  quantise(px.data);
  faceCtx.putImageData(px, 0, 0);

  const W = 32, H = 48, S = 4;
  const [body, ctx] = canvas(W, H);
  const rect = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  rect(8, 2, 16, 16, "#20242c");       // head outline, one pixel round the face
  ctx.drawImage(faceC, 9, 3);           // the face
  rect(13, 18, 6, 2, "#c98f66");       // neck
  rect(8, 20, 16, 13, "#20242c");      // torso outline
  rect(9, 20, 14, 12, shirt);           // shirt
  rect(5, 21, 3, 10, shirt); rect(24, 21, 3, 10, shirt);   // arms
  rect(5, 31, 3, 2, "#e0a882"); rect(24, 31, 3, 2, "#e0a882"); // hands
  rect(10, 33, 5, 10, "#2a3a55"); rect(17, 33, 5, 10, "#2a3a55"); // legs
  rect(9, 43, 6, 3, "#20242c"); rect(17, 43, 6, 3, "#20242c");    // shoes
  const [out, outCtx] = canvas(W * S, H * S);
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(body, 0, 0, W * S, H * S);
  return out.toDataURL("image/png");
}
