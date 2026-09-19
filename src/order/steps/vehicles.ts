// Step 5, Getting around: vehicle types as picture cards (the edition's allowance shown like an inventory),
// and the group's own car(s), each drawn from a photo.
import { el } from "../../dom";
import { orderAsset } from "../catalogue";
import { allowanceChip, heading, money, sectionHandle, stepEyebrow, type StepView } from "../context";
import { ADDONS } from "../prices";
import { MAX_OWN_CARS, OWN_CAR_DESCRIPTION_MAX, VEHICLE_TYPES, vehiclesSection, type OwnCar, type VehiclesChoices } from "../sections/vehicles";
import { fileButton, removeUpload, uploadUrl } from "../upload";
import "./vehicles.css";
import { carScene, loopBox } from "./loops";

const newCarId = () => `car-${(crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`;

export const vehiclesStep: StepView = (ctx, panel) => {
  const h = sectionHandle<VehiclesChoices>(ctx, "vehicles");
  const read = () => vehiclesSection.check(h.choices());
  const choices = read();
  const sc = h.context();
  const cur = ctx.currency();
  const urls: string[] = [];
  let alive = true;

  panel.append(heading(stepEyebrow("vehicles"), "How do you get around?",
    "Pick the ways to travel in your game. Nothing here is required: walking works fine too."));

  const banner = el("div", "s-vehicles-banner");
  banner.style.backgroundImage = `url(${orderAsset("veh_dealer.webp")})`;
  banner.setAttribute("aria-hidden", "true");
  panel.append(banner);

  // Vehicle types
  const types = el("section", "shelf");
  const head = el("div", "shelf-head");
  head.append(el("h2", null, "Vehicle types"), allowanceChip(choices.types.length, sc.includes.vehicles, money(ctx, ADDONS.vehicle.price[cur]), "vehicle types"));
  types.append(head);
  const grid = el("div", "game-grid s-vehicles-grid");
  for (const v of VEHICLE_TYPES) {
    const on = choices.types.includes(v.id);
    const b = el("button", `game${on ? " on" : ""}`);
    b.type = "button";
    b.setAttribute("aria-pressed", String(on));
    // Cars and taxis drive on their own 12-frame bob (./loops); the rest are still art for now.
    const loop = v.id === "car" || v.id === "taxi" ? loopBox(carScene(`vehicles-${v.id}`, `loop_veh_${v.id}.webp`, v.art, `${v.name} driving`), "art") : null;
    const art = loop ?? el("span", "art");
    if (!loop) art.style.backgroundImage = `url(${orderAsset(v.art)})`;
    const text = el("span", "game-text");
    text.append(el("b", null, v.name), el("span", null, v.blurb));
    b.append(art, text, el("span", "tick", on ? "✓" : "+"));
    b.onclick = () => {
      const c = read();
      const next = c.types.includes(v.id) ? c.types.filter(t => t !== v.id) : [...c.types, v.id];
      h.set(vehiclesSection.check({ ...c, types: next }));
    };
    grid.append(b);
  }
  types.append(grid);
  panel.append(types);

  // Their own car(s)
  const own = el("section", "shelf");
  const ownHead = el("div", "shelf-head");
  ownHead.append(el("h2", null, "Your own car"));
  own.append(ownHead);
  const intro = el("div", "upsell");
  intro.append(el("p", null, `Put a real car from the group in the game, drawn from a photo: ${money(ctx, ADDONS.own_car.price[cur])} each, up to ${MAX_OWN_CARS}.${choices.types.includes("car") ? "" : " It pairs well with Cars above, so you can drive it around."}`));
  own.append(intro);

  const setCar = (id: string, patch: Partial<OwnCar>, opts?: { rerender?: boolean }) => {
    const c = read();
    h.set({ ...c, ownCars: c.ownCars.map(car => (car.id === id ? { ...car, ...patch } : car)) }, opts);
  };

  const list = el("div", "s-vehicles-cars");
  choices.ownCars.forEach((car, i) => {
    const card = el("div", "s-vehicles-car");
    card.dataset.field = `car:${i}`;
    const field = el("label", "field");
    field.dataset.field = `car:${i}:description`;
    field.append(el("span", null, `Car ${i + 1}: who drives what?`));
    const input = el("input");
    input.type = "text";
    input.maxLength = OWN_CAR_DESCRIPTION_MAX;
    input.placeholder = "Mads's red Golf";
    input.value = car.description;
    input.addEventListener("input", () => setCar(car.id, { description: input.value.slice(0, OWN_CAR_DESCRIPTION_MAX) }, { rerender: false }));
    field.append(input);
    card.append(field);

    const photoRow = el("div", "s-vehicles-photo");
    photoRow.dataset.field = `car:${i}:photo`;
    if (car.photo) {
      const ref = car.photo;
      const thumb = el("div", "s-vehicles-thumb");
      const img = el("img");
      img.alt = `Photo of ${car.description.trim() || `car ${i + 1}`}`;
      void uploadUrl(ref).then(u => {
        if (!u) return;
        if (!alive) { URL.revokeObjectURL(u); return; }
        urls.push(u);
        img.src = u;
      });
      thumb.append(img);
      const x = el("button", "link-btn danger", "Remove photo");
      x.type = "button";
      x.onclick = () => {
        void removeUpload(ref);
        setCar(car.id, { photo: null });
      };
      photoRow.append(thumb, x);
    } else {
      photoRow.append(fileButton("Add a photo of the car", "image", ref => {
        const c = read().ownCars.find(o => o.id === car.id);
        if (!c || c.photo) { void removeUpload(ref); return; }
        setCar(car.id, { photo: ref });
      }));
    }
    card.append(photoRow);

    const remove = el("button", "link-btn danger", "Remove this car");
    remove.type = "button";
    remove.onclick = () => {
      const c = read();
      const gone = c.ownCars.find(o => o.id === car.id);
      if (gone?.photo) void removeUpload(gone.photo);
      h.set({ ...c, ownCars: c.ownCars.filter(o => o.id !== car.id) });
    };
    card.append(remove);
    list.append(card);
  });
  own.append(list);

  if (choices.ownCars.length < MAX_OWN_CARS) {
    const add = el("button", "btn ghost small", choices.ownCars.length ? "Add another car" : "Add a car");
    add.type = "button";
    add.onclick = () => {
      const c = read();
      if (c.ownCars.length >= MAX_OWN_CARS) return;
      h.set({ ...c, ownCars: [...c.ownCars, { id: newCarId(), description: "", photo: null }] });
    };
    own.append(add);
  }
  panel.append(own);

  return () => {
    alive = false;
    for (const u of urls) URL.revokeObjectURL(u);
  };
};
