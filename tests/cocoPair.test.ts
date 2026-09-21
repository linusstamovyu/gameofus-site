import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The Coco lab's start screen is two pictures of one person that the intro slides onto ONE spot and runs a
// digitise line down (heroLab.ts's `drawTransform`). `tools/cut_coco_pair.py` frames the photo and
// `tools/fit_coco_to_photo.py` warps the character onto that frame; the second is what makes them register,
// and it fails SILENTLY -- a bust that was cropped but never warped loads, draws, and simply shows a
// different-sized woman either side of the scan line. The cheap tripwire is the frame itself: the warp
// writes the photo's own pixel box, so the two files agreeing on their size means the warp ran on THIS
// photo. Re-crop the photo and this fails until the art tool is run again, which is the point.
const site = (p: string) => resolve(__dirname, "..", p);

/** A WebP file's pixel size, off the VP8/VP8L/VP8X chunk header. */
function webpSize(path: string): { w: number; h: number } {
  const b = readFileSync(site(path));
  expect(b.toString("ascii", 0, 4)).toBe("RIFF");
  expect(b.toString("ascii", 8, 12)).toBe("WEBP");
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return { w: (b.readUIntLE(24, 3) & 0xffffff) + 1, h: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
  if (kind === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  expect(kind).toBe("VP8 ");                       // lossy: the 10-byte frame header follows the sync code
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

describe("Coco's start-screen pair", () => {
  const PHOTO = "public/lab/coco_photo_cut.webp";
  const ART = "public/lab/coco_bust.webp";

  it("frames the character on the photograph's own pixel box", () => {
    expect(webpSize(ART)).toEqual(webpSize(PHOTO));
  });

  it("is what the hero table points at", () => {
    const src = readFileSync(site("src/heroLab/heroLab.ts"), "utf8");
    const coco = src.slice(src.indexOf("  coco: {"), src.indexOf("};", src.indexOf("  coco: {")));
    for (const f of [PHOTO, ART]) expect(coco).toContain(f.replace("public/", ""));
  });

  it("keeps the character out of cut_coco_pair.py, which frames the photo only", () => {
    // That tool cannot know the photo's proportions from a crop, so a re-run of it must never be able to
    // put an unwarped bust back over the warped one.
    const cut = readFileSync(site("tools/cut_coco_pair.py"), "utf8");
    expect(cut).not.toContain('(*art, "coco_bust")');
    expect(cut).toContain("fit_coco_to_photo.py");
  });
});
