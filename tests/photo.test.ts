// The one-photo check (owner, 15 Sep 2026): one person, a clear face AND head to feet. Pure rules over fixture
// detections; the browser half (MediaPipe) is exercised by hand in /order.html.
import { describe, expect, it } from "vitest";
import { legacyPhotoKeys, newDraft, reviveDraft, type Draft } from "../src/order/draft";
import { checkPayload } from "../src/order/payload";
import {
  bodyBox, faceCrop, headBoxFromPose, judgePhoto, landmarkSeen, laplacianVariance, LM, meanBrightness, missingBodyPart,
  type PhotoFacts, type PoseLandmark,
} from "../src/order/photoRules";

/** A person standing in the middle of a 1000×1500 photo, as 33 MediaPipe landmarks (x, y in 0..1). */
function standing(overrides: Partial<Record<number, Partial<PoseLandmark>>> = {}): PoseLandmark[] {
  const pose: PoseLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
  const at = (i: number, x: number, y: number) => (pose[i] = { x, y, visibility: 0.95 });
  at(LM.nose, 0.5, 0.12);
  for (const i of [1, 2, 3]) at(i, 0.48, 0.11);
  for (const i of [4, 5, 6]) at(i, 0.52, 0.11);
  at(LM.leftEar, 0.46, 0.115); at(LM.rightEar, 0.54, 0.115);
  at(9, 0.49, 0.135); at(10, 0.51, 0.135);
  at(LM.leftShoulder, 0.42, 0.22); at(LM.rightShoulder, 0.58, 0.22);
  for (const i of [13, 15, 17, 19, 21]) at(i, 0.38, 0.4);
  for (const i of [14, 16, 18, 20, 22]) at(i, 0.62, 0.4);
  at(LM.leftHip, 0.45, 0.5); at(LM.rightHip, 0.55, 0.5);
  at(25, 0.45, 0.7); at(26, 0.55, 0.7);
  at(LM.leftAnkle, 0.45, 0.88); at(LM.rightAnkle, 0.55, 0.88);
  at(LM.leftHeel, 0.45, 0.9); at(LM.rightHeel, 0.55, 0.9);
  at(LM.leftFoot, 0.44, 0.92); at(LM.rightFoot, 0.56, 0.92);
  for (const [i, o] of Object.entries(overrides)) pose[Number(i)] = { ...pose[Number(i)], ...o };
  return pose;
}

const hide = (...idx: number[]) => Object.fromEntries(idx.map(i => [i, { visibility: 0.1 }]));
const face = (w = 80, score = 0.9, x = 460, y = 130) => ({ x, y, width: w, height: w, score });
const facts = (p: Partial<PhotoFacts> = {}): PhotoFacts => ({ width: 1000, height: 1500, faces: [face()], poses: [standing()], brightness: 130, sharpness: 300, ...p });

describe("one photo: face and full body", () => {
  it("passes one person with a clear face, head to feet, and says where both are", () => {
    const v = judgePhoto(facts());
    expect(v.status).toBe("ok");
    expect(v.face).toMatchObject({ x: 460, y: 130, width: 80 });
    expect(v.body).not.toBeNull();
    const b = v.body!;
    // The box takes in the face and the feet and stays inside the photo.
    expect(b.y).toBeLessThanOrEqual(130);
    expect(b.y + b.height).toBeGreaterThanOrEqual(0.92 * 1500);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(1000);
  });

  it("fails without feet, with the owner's wording", () => {
    const v = judgePhoto(facts({ poses: [standing(hide(LM.leftAnkle, LM.rightAnkle, LM.leftHeel, LM.rightHeel, LM.leftFoot, LM.rightFoot))] }));
    expect(v.status).toBe("fail");
    expect(v.note).toBe("We can't see feet. Step back so the whole body is in the shot.");
  });

  it("counts feet guessed on or past the bottom edge as missing, even when the model is fairly sure", () => {
    // Measured on a photo cropped at the shins: the model put one ankle at y 1.003 (visibility 0.65), the other
    // side at 0.90 with visibility 0.26, heel and toes past the edge.
    const cropped = standing({
      [LM.leftAnkle]: { y: 1.003, visibility: 0.65 }, [LM.leftHeel]: { y: 1.017, visibility: 0.58 }, [LM.leftFoot]: { y: 1.096, visibility: 0.55 },
      [LM.rightAnkle]: { y: 0.904, visibility: 0.26 }, [LM.rightHeel]: { y: 0.889, visibility: 0.26 }, [LM.rightFoot]: { y: 0.978, visibility: 0.22 },
    });
    expect(missingBodyPart(cropped)).toBe("feet");
    // An ankle in shot with its foot cut off is still no feet.
    expect(missingBodyPart(standing({ [LM.leftHeel]: { y: 1.02 }, [LM.leftFoot]: { y: 1.05 }, [LM.rightHeel]: { y: 1.02 }, [LM.rightFoot]: { y: 1.04 } }))).toBe("feet");
    expect(landmarkSeen({ x: 0.5, y: 0.99, visibility: 0.9 })).toBe(true);
    expect(landmarkSeen({ x: 0.5, y: 1.003, visibility: 0.9 })).toBe(false);
  });

  it("names the first missing part, top down, and accepts one of each pair (side-on)", () => {
    expect(missingBodyPart(standing(hide(LM.nose)))).toBe("head");
    expect(missingBodyPart(standing(hide(LM.leftShoulder, LM.rightShoulder)))).toBe("shoulders");
    expect(missingBodyPart(standing(hide(LM.leftHip, LM.rightHip, LM.leftAnkle)))).toBe("hips");
    expect(missingBodyPart(standing(hide(LM.leftShoulder, LM.leftHip, LM.leftAnkle)))).toBeNull();
    expect(judgePhoto(facts({ poses: [standing(hide(LM.leftHip, LM.rightHip))] })).note).toMatch(/whole body/);
  });

  it("fails with no face", () => {
    const v = judgePhoto(facts({ faces: [] }));
    expect(v.status).toBe("fail");
    expect(v.note).toMatch(/^No face found/);
    expect(judgePhoto(facts({ faces: [face(80, 0.2)] })).status).toBe("fail"); // a low-confidence blob isn't a face
  });

  it("fails two people, whether it's the faces or the bodies that give it away", () => {
    expect(judgePhoto(facts({ faces: [face(), face(80, 0.9, 100, 200)] })).note).toMatch(/^Two people in this photo/);
    expect(judgePhoto(facts({ poses: [standing(), standing()] })).note).toMatch(/^Two people in this photo/);
    expect(judgePhoto(facts({ faces: [face(), face(), face()], poses: [standing()] })).note).toMatch(/^3 people/);
  });

  it("fails a close-up: a face but no body", () => {
    const v = judgePhoto(facts({ poses: [] }));
    expect(v.status).toBe("fail");
    expect(v.note).toMatch(/only see a face/);
    expect(judgePhoto(facts({ poses: [], faces: [] })).note).toMatch(/can't see anyone/);
  });

  it("keeps the older rules: too small fails, dark, bright, blurry and a tiny face only warn", () => {
    expect(judgePhoto(facts({ width: 300 })).status).toBe("fail");
    expect(judgePhoto(facts({ brightness: 30 })).status).toBe("warn");
    expect(judgePhoto(facts({ brightness: 240 })).status).toBe("warn");
    expect(judgePhoto(facts({ sharpness: 5 })).status).toBe("warn");
    expect(judgePhoto(facts({ faces: [face(30)] })).note).toMatch(/face is very small/);
  });

  it("never blocks on a device that can't run a detector, and still says what it did check", () => {
    expect(judgePhoto(facts({ faces: null, poses: null })).status).toBe("unchecked");
    expect(judgePhoto(facts({ faces: null })).note).toMatch(/check the face by hand/);
    expect(judgePhoto(facts({ poses: null })).note).toMatch(/check the full body by hand/);
    // …but a detector that did run still fails what it saw.
    expect(judgePhoto(facts({ faces: null, poses: [standing(hide(LM.leftAnkle, LM.rightAnkle))] })).status).toBe("fail");
  });

  it("picks the face on the body's head, and can find the head from the pose alone", () => {
    // A "face" nowhere near the body's head (a guitar, a print on a shirt) is not their face.
    const guitar = face(250, 0.61, 200, 700);
    const v = judgePhoto(facts({ faces: [guitar] }));
    expect(v.status).toBe("fail");
    expect(v.note).toMatch(/^No face found/);
    expect(judgePhoto(facts({ faces: [face(), guitar] }))).toMatchObject({ status: "ok", face: { x: 460 } });
    // A clear, big face elsewhere is a second person; a small one far behind is not.
    expect(judgePhoto(facts({ faces: [face(), face(80, 0.9, 800, 900)] })).note).toMatch(/^Two people/);
    expect(judgePhoto(facts({ faces: [face(), face(20, 0.9, 800, 900)] })).status).toBe("ok");
    const head = headBoxFromPose(standing(), 1000, 1500)!;
    expect(head.x).toBeLessThan(500);
    expect(head.x + head.width).toBeGreaterThan(500);
    expect(head.y).toBeLessThan(0.12 * 1500);
    expect(headBoxFromPose(standing(hide(0, 1, 2, 3, 4, 5, 6, 7, 8)), 1000, 1500)).toBeNull();
  });

  it("keeps the body box and the face crop inside the photo", () => {
    const edge = standing({ [LM.leftFoot]: { x: -0.2, y: 1.3 } });
    const b = bodyBox(edge, 1000, 1500, face(80, 0.9, 0, 0));
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(1500);
    const c = faceCrop(1000, 800, { x: 900, y: 700, width: 200, height: 200 });
    expect(c.x + c.size).toBeLessThanOrEqual(1000);
    expect(c.y + c.size).toBeLessThanOrEqual(800);
    expect(faceCrop(600, 900, null).size).toBeLessThanOrEqual(600);
  });

  it("measures brightness and blur", () => {
    const flat = new Uint8ClampedArray(10 * 10 * 4).fill(200);
    expect(Math.round(meanBrightness(flat))).toBe(200);
    expect(laplacianVariance(flat, 10, 10)).toBe(0);
    const checker = new Uint8ClampedArray(10 * 10 * 4);
    for (let i = 0; i < 100; i++) checker.fill((i % 10) % 2 === (Math.floor(i / 10) % 2) ? 255 : 0, i * 4, i * 4 + 3);
    expect(laplacianVariance(checker, 10, 10)).toBeGreaterThan(1000);
  });
});

describe("drafts from before the one-photo rule", () => {
  const meta = (key: string) => ({ key, width: 900, height: 1200, status: "ok", note: "Looks good.", face: { x: 1, y: 2, width: 3, height: 4, score: 0.9 } });
  const old = (photos: Record<string, unknown>) => ({ ...newDraft(), friends: [{ id: "a", name: "Mads", colour: "#1a9e95", preview: "data:image/png;base64,xx", photos }] });

  it("keeps the full-body photo (else the face, else the outfit), marks it for a re-check and lets the rest go", () => {
    const raw = old({ face: meta("a-face"), body: meta("a-body"), outfit: meta("a-outfit") });
    const d = reviveDraft(raw);
    expect(d.friends[0]).toEqual({ id: "a", name: "Mads", photo: { key: "a-body", width: 900, height: 1200, status: "unchecked", note: "Checking this photo again…", face: null, body: null, recheck: true } });
    expect(legacyPhotoKeys(raw, d).sort()).toEqual(["a-face", "a-outfit"]);
    expect(reviveDraft(old({ face: meta("f"), outfit: meta("o") })).friends[0].photo?.key).toBe("f");
    expect(reviveDraft(old({ outfit: meta("o") })).friends[0].photo?.key).toBe("o");
    expect(reviveDraft(old({})).friends[0].photo).toBeNull();
    expect(Object.keys(d.friends[0])).not.toContain("preview");
  });

  it("round-trips a one-photo draft unchanged, and drops junk boxes", () => {
    let d: Draft = { ...newDraft(), friends: [{ id: "a", name: "M", photo: { key: "k", width: 800, height: 1200, status: "ok", note: "", face: { x: 1, y: 2, width: 30, height: 30, score: 0.8 }, body: { x: 0, y: 0, width: 800, height: 1200 } } }] };
    const back = reviveDraft(JSON.parse(JSON.stringify(d)));
    expect(back.friends).toEqual(d.friends);
    expect(legacyPhotoKeys(d, back)).toEqual([]);
    d = { ...d, friends: [{ ...d.friends[0], photo: { ...d.friends[0].photo!, body: { x: "no" } as never } }] };
    expect(reviveDraft(d).friends[0].photo?.body).toBeNull();
  });
});

describe("crop numbers in the order", () => {
  const good = {
    edition: "deluxe", currency: "DKK", country: "dk", bigGames: ["kart"], minigames: [], customGame: "", partyMode: false, flexPass: false, directorsCut: false,
    organiser: { name: "Mads", email: "m@example.com", birthYear: "", adultsConfirmed: false, photosPermission: true, startNow: true }, shownTotal: 0,
  };

  it("keeps whole-number boxes inside the photo and nothing else", () => {
    const photo = { width: 1000.4, height: 1500, face: { x: 460, y: 130, width: 80, height: 80, score: 0.9 }, body: { x: 900, y: 0, width: 400, height: 1500 } };
    const r = checkPayload({ ...good, friends: [{ id: "a1", name: "Mads", photo }, { id: "b2", name: "Rico", photo: "<script>" }] }, 2026);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.friends[0].photo).toEqual({ width: 1000, height: 1500, face: { x: 460, y: 130, width: 80, height: 80 }, body: null });
    expect(r.value.friends[1].photo).toBeNull();
  });
});
