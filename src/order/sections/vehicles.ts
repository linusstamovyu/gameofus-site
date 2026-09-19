// Step 5, Getting around: which vehicle types are in the game, plus the group's own car(s) drawn from a photo.
// PURE (see ./types): shared by the page and the Worker.
import type { Section, SectionProblem, UploadRef } from "./types";

export type VehicleId = "car" | "scooter" | "taxi" | "minecart" | "kart";

export interface VehicleType {
  id: VehicleId;
  name: string;
  blurb: string;
  art: string;
}

export const VEHICLE_TYPES: VehicleType[] = [
  { id: "car", name: "Cars", blurb: "Cars and a dealership: buy one and drive it around", art: "veh_car.webp" },
  { id: "scooter", name: "Rental scooters", blurb: "Rental scooters with an app on the phone", art: "veh_scooter.webp" },
  { id: "taxi", name: "Taxi", blurb: "Taxi rides between your places, with a fare map", art: "veh_taxi.webp" },
  { id: "minecart", name: "Mine carts", blurb: "Mine carts on rails", art: "veh_minecart.webp" },
  { id: "kart", name: "Karts", blurb: "Karts (the Kart Race game uses these)", art: "veh_kart.webp" },
];

export const MAX_OWN_CARS = 5;
export const OWN_CAR_DESCRIPTION_MAX = 100;

export interface OwnCar {
  id: string;
  description: string;
  photo: UploadRef | null;
}

export interface VehiclesChoices {
  types: VehicleId[];
  ownCars: OwnCar[];
}

/** Control characters become spaces. */
const noControl = (ch: string) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch);
const ID_RE = /^[a-zA-Z0-9-]{1,40}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Strip control characters, collapse whitespace, trim and cap. */
function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.split("").map(noControl).join("").replace(/\s+/g, " ").trim().slice(0, max);
}

export function checkImageRef(raw: unknown): UploadRef | null {
  if (!isRecord(raw)) return null;
  const { id, kind, name, type, size } = raw;
  if (typeof id !== "string" || !ID_RE.test(id)) return null;
  if (kind !== "image") return null;
  if (typeof type !== "string" || !type) return null;
  if (typeof size !== "number" || !Number.isFinite(size) || size < 0) return null;
  return { id, kind: "image", name: cleanText(name, 120), type: type.slice(0, 100), size: Math.floor(size) };
}

const typeName = (id: VehicleId) => VEHICLE_TYPES.find(v => v.id === id)!.name;

export const vehiclesSection: Section<VehiclesChoices> = {
  id: "vehicles",
  label: "Getting around",
  defaults: () => ({ types: [], ownCars: [] }),

  check(raw) {
    const r = isRecord(raw) ? raw : {};
    const types: VehicleId[] = [];
    if (Array.isArray(r.types)) {
      for (const t of r.types) {
        if (VEHICLE_TYPES.some(v => v.id === t) && !types.includes(t as VehicleId)) types.push(t as VehicleId);
      }
    }
    // Keep the catalogue order so summaries read the same however they were picked.
    types.sort((a, b) => VEHICLE_TYPES.findIndex(v => v.id === a) - VEHICLE_TYPES.findIndex(v => v.id === b));

    const ownCars: OwnCar[] = [];
    const seenIds = new Set<string>();
    const seenPhotos = new Set<string>();
    if (Array.isArray(r.ownCars)) {
      for (const c of r.ownCars) {
        if (ownCars.length >= MAX_OWN_CARS) break;
        if (!isRecord(c) || typeof c.id !== "string" || !ID_RE.test(c.id) || seenIds.has(c.id)) continue;
        seenIds.add(c.id);
        let photo = checkImageRef(c.photo);
        if (photo && seenPhotos.has(photo.id)) photo = null;
        if (photo) seenPhotos.add(photo.id);
        ownCars.push({ id: c.id, description: cleanText(c.description, OWN_CAR_DESCRIPTION_MAX), photo });
      }
    }
    return { types, ownCars };
  },

  addons(c, ctx) {
    const out: Partial<Record<"vehicle" | "own_car", number>> = {};
    const extra = Math.max(0, c.types.length - ctx.includes.vehicles);
    if (extra > 0) out.vehicle = extra;
    if (c.ownCars.length > 0) out.own_car = c.ownCars.length;
    return out;
  },

  problems(c) {
    const out: SectionProblem[] = [];
    c.ownCars.forEach((car, i) => {
      const label = car.description.trim() ? `"${car.description.trim()}"` : `Car ${i + 1}`;
      if (!car.description.trim()) out.push({ message: `${label} needs a short description, like "Mads's red Golf".`, field: `car:${i}:description` });
      if (!car.photo) out.push({ message: `${label} needs a photo of the car.`, field: `car:${i}:photo` });
    });
    return out;
  },

  summary(c) {
    const lines: string[] = [];
    if (c.types.length) lines.push(`Vehicles: ${c.types.map(typeName).join(", ")}`);
    for (const car of c.ownCars) lines.push(`Their own car: ${car.description.trim() || "(no description)"}${car.photo ? "" : " (no photo yet)"}`);
    return lines;
  },

  uploads: c => c.ownCars.flatMap(car => (car.photo ? [car.photo] : [])),
};

