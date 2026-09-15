// Copies MediaPipe's WASM runtime out of node_modules into public/vendor so the photo check is
// self-hosted (plan 17: friends' photos never go to a third party, and no CDN is involved either).
// Runs before dev and build; the copy is gitignored, the face model next to it is committed.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const from = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
const to = resolve(root, "public/vendor/mediapipe/wasm");
mkdirSync(to, { recursive: true });
// FilesetResolver picks the SIMD build when the browser supports it and the no-SIMD one otherwise.
for (const f of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  copyFileSync(resolve(from, f), resolve(to, f));
}
console.log("copied MediaPipe wasm to public/vendor/mediapipe/wasm");
