// Step 4, Your world: the places in the game (one zone each) and the real shops or bars shown as signage.
import "./world.css";
import { el } from "../../dom";
import { orderAsset } from "../catalogue";
import { allowanceChip, checkbox, heading, money, sectionHandle, stepEyebrow, type StepView } from "../context";
import { ADDONS } from "../prices";
import {
  KIND_LABEL, MAX_PLACE_PHOTOS, MAX_PLACES, MAX_SIGNS, NAME_MAX, NOTES_MAX, PIN_MAX, PLACE_KINDS, PLACE_KITS, SIGN_MAX,
  type Place, type PlaceKit, type WorldChoices,
} from "../sections/world";
import { fileButton, removeUpload, uploadUrl } from "../upload";

const KIT_LABEL: Record<PlaceKit, string> = {
  home: "Home", town: "Town", beach: "Beach", harbour: "Harbour", city: "City", stadium: "Stadium", nightlife: "Nightlife", countryside: "Countryside",
};

const newPlaceId = () => `place-${(crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`;

export const worldStep: StepView = (ctx, panel) => {
  const h = sectionHandle<WorldChoices>(ctx, "world");
  const c = h.choices();
  const cur = ctx.currency();
  const included = h.context().includes.zones;
  const urls: string[] = [];
  let alive = true;

  const setPlace = (id: string, patch: Partial<Place>, rerender = true) => {
    const now = h.choices();
    h.set({ ...now, places: now.places.map(p => (p.id === id ? { ...p, ...patch } : p)) }, rerender ? undefined : { rerender: false });
  };

  panel.append(heading(stepEyebrow("world"), "Where does your story happen?",
    "Tell us the places that matter: your home base, the town you always end up in, a trip abroad. Each place becomes an area you can walk around."));

  const shelf = el("section", "shelf");
  const head = el("div", "shelf-head");
  head.append(el("h2", null, "Places"), allowanceChip(c.places.length, included, money(ctx, ADDONS.zone.price[cur]), "places"));
  shelf.append(head);
  shelf.append(el("p", "rules", `Each place is built in the art style closest to it. Want it to look like the real thing? Build it from your photos (${money(ctx, ADDONS.zone_photos.price[cur])} as an extra place). Included places cover photo places first.`));

  shelf.dataset.field = "places";
  c.places.forEach((place, i) => shelf.append(placeCard(place, i)));

  if (c.places.length < MAX_PLACES) {
    const add = el("button", "btn ghost small s-world-add", c.places.length ? "Add another place" : "Add your home base");
    add.type = "button";
    add.onclick = () => {
      const now = h.choices();
      if (now.places.length >= MAX_PLACES) return;
      const first = now.places.length === 0;
      const place: Place = { id: newPlaceId(), kind: first ? "home" : "town", kit: first ? "home" : "town", name: "", mapPin: "", fromPhotos: false, photos: [], notes: "" };
      h.set({ ...now, places: [...now.places, place] });
    };
    shelf.append(add);
  } else {
    shelf.append(el("p", "s-world-note", `That's the most places one game can hold (${MAX_PLACES}).`));
  }
  panel.append(shelf);

  panel.append(signsBlock());

  function placeCard(place: Place, index: number): HTMLElement {
    const card = el("article", "s-world-place");
    card.dataset.field = `place:${index}`;
    const top = el("div", "s-world-place-head");
    top.append(el("h3", null, place.name.trim() || `Place ${index + 1}`));
    const remove = el("button", "link-btn danger", "Remove");
    remove.type = "button";
    remove.onclick = () => {
      const now = h.choices();
      for (const ref of place.photos) void removeUpload(ref);
      h.set({ ...now, places: now.places.filter(p => p.id !== place.id) });
    };
    top.append(remove);
    card.append(top);

    // What kind of place
    const kinds = el("div", "s-world-kinds");
    kinds.setAttribute("role", "group");
    kinds.setAttribute("aria-label", "What kind of place");
    for (const k of PLACE_KINDS) {
      const b = el("button", `s-world-kind${place.kind === k ? " on" : ""}`, KIND_LABEL[k]);
      b.type = "button";
      b.setAttribute("aria-pressed", String(place.kind === k));
      b.onclick = () => setPlace(place.id, { kind: k });
      kinds.append(b);
    }
    card.append(kinds);
    if (place.kind === "country") card.append(el("p", "s-world-note", "You'll fly there from the airport in the game."));

    const nameField = textField("Name", place.name, NAME_MAX, "Our flat in Nørrebro", v => setPlace(place.id, { name: v }, false));
    nameField.dataset.field = `place:${index}:name`;
    card.append(nameField);

    // Art style
    card.append(el("p", "s-world-label", "Closest art style"));
    const kits = el("div", "s-world-kits");
    for (const k of PLACE_KITS) {
      const on = place.kit === k;
      const b = el("button", `game s-world-kit${on ? " on" : ""}`);
      b.type = "button";
      b.setAttribute("aria-pressed", String(on));
      const art = el("span", "art");
      art.style.backgroundImage = `url(${orderAsset(`world_${k}.webp`)})`;
      const text = el("span", "game-text");
      text.append(el("b", null, KIT_LABEL[k]));
      b.append(art, text, el("span", "tick", on ? "✓" : "+"));
      b.onclick = () => setPlace(place.id, { kit: k });
      kits.append(b);
    }
    card.append(kits);

    card.append(checkbox(`Build it from our photos (${money(ctx, ADDONS.zone_photos.price[cur])} if it's an extra place)`, place.fromPhotos, v => setPlace(place.id, { fromPhotos: v })));

    // Photos
    const photos = el("div", "s-world-photos");
    photos.dataset.field = `place:${index}:photos`;
    for (const ref of place.photos) {
      const fig = el("figure", "s-world-thumb");
      const img = el("img");
      img.alt = `Photo of ${place.name.trim() || "this place"}`;
      void uploadUrl(ref).then(u => {
        if (!u) return;
        if (!alive) { URL.revokeObjectURL(u); return; }
        urls.push(u);
        img.src = u;
      });
      const x = el("button", "s-world-thumb-x", "×");
      x.type = "button";
      x.setAttribute("aria-label", "Remove photo");
      x.onclick = () => {
        void removeUpload(ref);
        const p = h.choices().places.find(pl => pl.id === place.id);
        if (p) setPlace(place.id, { photos: p.photos.filter(r => r.id !== ref.id) });
      };
      fig.append(img, x);
      photos.append(fig);
    }
    card.append(photos);
    if (place.photos.length < MAX_PLACE_PHOTOS) {
      card.append(fileButton("Add photo", "image", ref => {
        const p = h.choices().places.find(pl => pl.id === place.id);
        if (!p || p.photos.length >= MAX_PLACE_PHOTOS) { void removeUpload(ref); return; }
        setPlace(place.id, { photos: [...p.photos, ref] });
      }));
    }
    card.append(el("p", "s-world-note", place.fromPhotos
      ? `Up to ${MAX_PLACE_PHOTOS} photos. Street, front door, the view: whatever makes it recognisable.`
      : `Optional: up to ${MAX_PLACE_PHOTOS} photos to guide the details.`));

    card.append(textField("Map link or address (optional)", place.mapPin, PIN_MAX, "Paste a map link or type the address", v => setPlace(place.id, { mapPin: v }, false)));

    const notes = el("label", "field");
    notes.append(el("span", null, "Anything we should know (optional)"));
    const ta = el("textarea", "s-world-textarea");
    ta.rows = 3;
    ta.maxLength = NOTES_MAX;
    ta.placeholder = "The balcony where every night ends, the corner shop that's always open…";
    ta.value = place.notes;
    ta.addEventListener("input", () => setPlace(place.id, { notes: ta.value }, false));
    notes.append(ta);
    card.append(notes);
    return card;
  }

  function signsBlock(): HTMLElement {
    const box = el("section", "shelf");
    const head2 = el("div", "shelf-head");
    head2.append(el("h2", null, "Shop and bar signs"));
    if (c.signs.length) head2.append(el("span", "chip-inv over", `${c.signs.length} × ${money(ctx, ADDONS.shop_sign.price[cur])}`));
    box.append(head2);
    const up = el("div", "upsell");
    up.append(el("p", null, `Your real local, kebab shop or corner shop on a sign in the game. ${money(ctx, ADDONS.shop_sign.price[cur])} each.`));

    const list = el("ul", "s-world-signs");
    c.signs.forEach((name, i) => {
      const li = el("li", "s-world-sign");
      li.append(el("span", null, name));
      const x = el("button", "link-btn danger", "Remove");
      x.type = "button";
      x.setAttribute("aria-label", `Remove sign ${name}`);
      x.onclick = () => {
        const now = h.choices();
        h.set({ ...now, signs: now.signs.filter((_, j) => j !== i) });
      };
      li.append(x);
      list.append(li);
    });
    if (c.signs.length) up.append(list);

    if (c.signs.length < MAX_SIGNS) {
      const row = el("div", "s-world-sign-add");
      const label = el("label", "field");
      label.append(el("span", null, "Sign name"));
      const input = el("input");
      input.type = "text";
      input.maxLength = SIGN_MAX;
      input.placeholder = "The Rusty Anchor";
      label.append(input);
      const add = el("button", "btn small", "Add sign");
      add.type = "button";
      const commit = () => {
        const name = input.value.trim().slice(0, SIGN_MAX);
        const now = h.choices();
        if (!name || now.signs.length >= MAX_SIGNS) return;
        h.set({ ...now, signs: [...now.signs, name] });
      };
      add.onclick = commit;
      input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); commit(); } });
      row.append(label, add);
      up.append(row);
    }
    box.append(up);
    return box;
  }

  return () => {
    alive = false;
    for (const u of urls) URL.revokeObjectURL(u);
  };
};

function textField(label: string, value: string, max: number, placeholder: string, onInput: (v: string) => void): HTMLElement {
  const f = el("label", "field");
  f.append(el("span", null, label));
  const input = el("input");
  input.type = "text";
  input.maxLength = max;
  input.placeholder = placeholder;
  input.value = value;
  input.addEventListener("input", () => onInput(input.value));
  f.append(input);
  return f;
}
