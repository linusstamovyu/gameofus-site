// Step 3, Games: two shelves (big games, party minigames) and "invent a game" (plan 07 Q10), with the
// edition's allowance shown like an inventory and an upgrade hint when a bigger edition costs no more (Q22).
import { el } from "../../dom";
import { perkNote } from "./perkNote";
import { BIG_GAMES, MINIGAME_GROUPS, MINIGAMES, minigameLocked, orderAsset } from "../catalogue";
import { allowanceChip, checkbox, heading, stepEyebrow, money, type Ctx, type StepView } from "../context";
import { allowanceUse, chooseEdition, partyModeAvailable, setPartyMode, toggleIn, toggleMinigame, toPicks } from "../draft";
import { ADDONS, upgradeHint } from "../prices";
import { GAME_SCENES } from "../preview/gameScenes";
import { loopPreview, type LoopScene } from "../preview/loop";

export const gamesStep: StepView = (ctx, panel) => {
  const d = ctx.draft();
  const cur = ctx.currency();
  const use = allowanceUse(d);
  panel.append(heading(stepEyebrow("games"), "Choose the games",
    "Big games are the set pieces a chapter is built around. Party minigames are quick games you play together. Turn-based battles are always in."));

  const hint = upgradeHint(toPicks(d), cur, ctx.paidOrders());
  if (hint) {
    const box = el("div", "upgrade");
    const name = hint.edition.charAt(0).toUpperCase() + hint.edition.slice(1);
    box.append(el("span", null, hint.saves > 0
      ? `${name} covers everything you've picked and saves you ${money(ctx, hint.saves)}.`
      : `${name} covers everything you've picked for the same price, with more room to spare.`));
    const b = el("button", "btn small", `Switch to ${name}`);
    b.type = "button";
    b.onclick = () => ctx.update(dr => chooseEdition(dr, hint.edition));
    box.append(b);
    panel.append(box);
  }

  // Big games
  const big = el("section", "shelf");
  const bigHead = el("div", "shelf-head");
  bigHead.append(el("h2", null, "Big games"), allowanceChip(use.bigGames.used, use.bigGames.included, money(ctx, ADDONS.big_game.price[cur]), "big games"));
  big.append(bigHead);
  const bigGrid = el("div", "game-grid");
  for (const g of BIG_GAMES) bigGrid.append(gameCard(ctx, g.name, g.blurb, orderAsset(g.art), d.bigGames.includes(g.id), () => ctx.update(dr => ({ ...dr, bigGames: toggleIn(dr.bigGames, g.id) })), "game", GAME_SCENES[g.id]));
  big.append(bigGrid);

  const invent = el("div", "invent");
  invent.append(el("b", null, "Invent a game"), el("p", null, `Got a memory that needs its own rules? Describe it and we'll quote it (from ${money(ctx, ADDONS.big_game_custom.price[cur])}). Orders with a custom game are sent as a request, not paid straight away.`));
  const ta = el("textarea");
  ta.rows = 3;
  ta.maxLength = 2000;
  ta.placeholder = "The night we tried to get the whole group through one revolving door…";
  ta.value = d.customGame;
  ta.addEventListener("input", () => ctx.update(dr => ({ ...dr, customGame: ta.value }), { rerender: false }));
  invent.append(ta);
  big.append(invent);
  panel.append(big);

  // Party minigames
  const mini = el("section", "shelf");
  const miniHead = el("div", "shelf-head");
  miniHead.append(el("h2", null, "Party minigames"), allowanceChip(use.minigames.used, use.minigames.included, money(ctx, ADDONS.minigame.price[cur]), "minigames"));
  mini.append(miniHead);
  // Party Mode (18+): the drinking games are always on the shelf, greyed out until it's ticked (owner, 2026-09-15).
  // A group that said on the consent screen that not everyone is 18+ can't tick it at all.
  const party = el("div", "party");
  const partyPrice = money(ctx, ADDONS.party_mode.price[cur]);
  const canParty = partyModeAvailable(d);
  const partyBox = checkbox(`Party Mode (18+) · ${partyPrice}: drinking stakes on the minigames, sips on wins and a Drunk Meter. Unlocks King's Cup and The Bus.`, d.partyMode, v => ctx.update(dr => setPartyMode(dr, v)));
  const noAdults = "Party Mode is only for groups where everyone is 18 or over. You told us not everyone is, so it stays off.";
  if (!canParty) {
    partyBox.classList.add("disabled");
    partyBox.title = noAdults;
    partyBox.querySelector("input")!.disabled = true;
  }
  party.append(partyBox);
  if (!canParty) {
    const why = el("p", "party-why", `${noAdults} `);
    const change = el("button", "link-btn", "Change your answer");
    change.type = "button";
    change.onclick = () => ctx.openConsent();
    why.append(change);
    party.append(why);
  }
  mini.append(party);
  // Beach tour bonus (plan 18): all 12 minigames free below Ultimate, Party Mode free on it.
  for (const kind of ["minigames", "party_mode"] as const) { const n = perkNote(ctx, kind); if (n) mini.append(n); }
  for (const group of MINIGAME_GROUPS) {
    const items = MINIGAMES.filter(m => m.group === group);
    if (!items.length) continue;
    mini.append(el("h3", "group", group));
    const grid = el("div", "mini-grid");
    for (const m of items) {
      const locked = minigameLocked(m, d.partyMode);
      const tag = !m.drinking ? "" : locked ? (canParty ? `18+ · tap to add Party Mode (${partyPrice})` : "18+ · locked") : "18+ · Party Mode";
      const card = gameCard(ctx, m.name, tag, orderAsset(m.art), d.minigames.includes(m.id), () => {
        if (!locked) return ctx.update(dr => toggleMinigame(dr, m.id));
        if (!canParty) return ctx.notify(noAdults, "error");
        ctx.update(dr => setPartyMode(dr, true));
        ctx.notify(`Party Mode (18+) is on (${partyPrice}). Tap ${m.name} again to add it.`);
      }, "mini");
      if (locked) {
        card.classList.add("locked");
        card.title = canParty ? `A drinking game. Tick Party Mode (18+) to unlock it.` : noAdults;
        card.setAttribute("aria-disabled", String(!canParty));
        card.querySelector(".tick")!.textContent = "18+";
      }
      grid.append(card);
    }
    mini.append(grid);
  }
  panel.append(mini);
};

function gameCard(_ctx: Ctx, name: string, blurb: string, art: string, on: boolean, toggle: () => void, cls = "game", scene?: LoopScene): HTMLElement {
  const b = el("button", `${cls}${on ? " on" : ""}`);
  b.type = "button";
  b.setAttribute("aria-pressed", String(on));
  const img = el("span", "art");
  img.style.backgroundImage = `url(${art})`;
  if (scene) {
    // A moving loop of the mechanic; the still stays as its poster (autoplays on screen, see preview/loop.ts).
    img.style.position = "relative";
    img.append(loopPreview(scene, { poster: art, label: `${name}: gameplay preview` }));
  }
  const text = el("span", "game-text");
  text.append(el("b", null, name));
  if (blurb) text.append(el("span", null, blurb));
  b.append(img, text, el("span", "tick", on ? "✓" : "+"));
  b.onclick = toggle;
  return b;
}
