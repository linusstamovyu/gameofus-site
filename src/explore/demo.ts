/**
 * Playing a party minigame on the Explore page (owner, 20 Sep 2026).
 *
 * The twelve minigames were the one part of the catalogue a visitor could not see working: nine big games
 * carry a scripted loop, and these carried a still. They do not need a preview written for them, because a
 * tested, playable build of every one already exists — so the card opens THE REAL GAME, in an iframe, from
 * the library's own build (tools/deploy_minigame_demos.py copies it in, bytes and nothing else).
 *
 * Things that are the way they are for a reason:
 *  - THE IFRAME IS BUILT ON OPEN AND DESTROYED ON CLOSE. A sandbox runs its own setTimeouts, which nothing
 *    here can pause; dropping the element is what stops them, and it is also what keeps twelve games off the
 *    page until somebody asks for one. Same trade the live game's embedded module documents.
 *  - NO CONTEXT OBJECT IS INJECTED, only the one thing a stranger would otherwise be told wrong. The live
 *    game sets `window.FROKOST_MINIGAME_CONTEXT` because it has a save to read a name, a difficulty and a
 *    Party Mode out of; a shop window has none of that, and every sandbox opens on its own setup screen. The
 *    exception is the NAME: with nothing passed, all twelve fall back to the library author's own ("I'm
 *    looking for someone named... Linus!"), which on a public page is a stranger's name in the middle of a
 *    demo. Every sandbox also reads `?playerName`, so it goes in the URL — which is what lets this stay a
 *    plain `src=` rather than a document assembled around a <base> the way the live game has to.
 *  - THE NAME IS KAI, the lad the rest of the site has spent its whole homepage introducing.
 *  - NOTHING IS SCORED. The sandbox fires frokost:minigame-complete when a round ends; here that only draws
 *    the line under the game, because a shop window has no ledger and a demo that pretended to cost you a
 *    sip would be telling a lie about a game you have not bought.
 */
import "./demo.css";
import { el } from "../dom";
import { track } from "../shared/analytics";

/** Where deploy_minigame_demos.py puts the builds, relative to the page. */
const BASE = "minigames";
/** Who the game thinks it is dealing in. See the note above: unset, the sandboxes name their own author. */
const DEMO_PLAYER = "Kai";

let root: HTMLElement | null = null;
let frameBox: HTMLElement | null = null;
let titleEl: HTMLElement | null = null;
let noteEl: HTMLElement | null = null;
let closeBtn: HTMLButtonElement | null = null;
let openId: string | null = null;
let returnFocus: HTMLElement | null = null;

function build(): void {
  if (root) return;
  root = el("div", "mg-demo");
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Play a party minigame");

  const panel = el("div", "mg-panel");
  const head = el("div", "mg-head");
  titleEl = el("b", "mg-title", "");
  closeBtn = el("button", "mg-close", "✕");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close the game");
  closeBtn.addEventListener("click", () => close());
  head.append(titleEl, closeBtn);

  frameBox = el("div", "mg-frame");
  noteEl = el("p", "mg-note", "");

  panel.append(head, frameBox, noteEl);
  root.append(panel);
  // The scrim closes; the panel does not, so a click inside the game never ends it.
  root.addEventListener("pointerdown", e => { if (e.target === root) close(); });
  document.body.append(root);

  // Escape reaches this even while the game has focus inside the frame? It does not — an iframe keeps its
  // own key events — which is why the close button is the real control and this is only the shortcut for
  // somebody who has clicked back out onto the page.
  addEventListener("keydown", e => { if (e.key === "Escape" && openId) { e.preventDefault(); close(); } });
}

/** Open `id` in the modal. `title` is what the card calls it, so the two can never disagree. */
export function openMinigameDemo(id: string, title: string, from: HTMLElement | null = null): void {
  build();
  if (!root || !frameBox || !titleEl || !noteEl) return;
  returnFocus = from;
  openId = id;
  titleEl.textContent = title;
  noteEl.textContent = "This is the real minigame, running the same build that goes in your game. Nothing here is scored.";

  const frame = el("iframe");
  frame.src = `${BASE}/${id}/index.html?playerName=${encodeURIComponent(DEMO_PLAYER)}`;
  frame.title = `${title}: playable demo`;
  frame.setAttribute("allow", "autoplay");
  // A build that is not deployed leaves the card working and says so, rather than an empty black box.
  frame.addEventListener("error", () => { if (noteEl) noteEl.textContent = "This demo could not be loaded. Everything else on the page still works."; });
  frameBox.replaceChildren(frame);

  root.hidden = false;
  document.body.classList.add("mg-open");
  closeBtn?.focus();
  track("minigame_demo_open", { id });
}

export function close(): void {
  if (!root || !openId) return;
  track("minigame_demo_close", { id: openId });
  openId = null;
  // Dropping the iframe is what stops the sandbox's own timers: there is no other handle on them.
  frameBox?.replaceChildren();
  root.hidden = true;
  document.body.classList.remove("mg-open");
  returnFocus?.focus();
  returnFocus = null;
}
