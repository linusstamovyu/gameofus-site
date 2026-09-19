// "Take me to what's missing" (17 Sep 2026): when Next or Start building is refused, the first problem's field
// is scrolled into view, outlined, given its message right beside it and focused. Step views tag their controls
// with data-field; problems name the same key (draft.ts, sections/types.ts).

/**
 * The data-field keys to try for a problem, most specific first: "place:0:name" -> place:0:name, place:0, place.
 * A view that only tags the whole place card still catches a problem about its name.
 */
export function fieldCandidates(key: string): string[] {
  const parts = key.split(":").filter(Boolean);
  const out: string[] = [];
  for (let n = parts.length; n > 0; n--) out.push(parts.slice(0, n).join(":"));
  return out;
}

/** The element a field key points at inside `root`, or null when no candidate is on screen. */
export function findField(root: ParentNode, key: string): HTMLElement | null {
  for (const k of fieldCandidates(key)) {
    const hit = root.querySelector<HTMLElement>(`[data-field="${CSS.escape(k)}"]`);
    if (hit) return hit;
  }
  return null;
}

const FOCUSABLE = "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** Remove every mark left by showProblem inside `root`. */
export function clearProblemMarks(root: ParentNode): void {
  root.querySelectorAll(".fix-msg").forEach(n => n.remove());
  root.querySelectorAll(".needs-fix").forEach(n => n.classList.remove("needs-fix"));
}

/**
 * Point the buyer at a problem's field. Returns false when the problem has no field or it can't be found,
 * so the caller can fall back to scrolling the panel's top.
 */
export function showProblem(root: HTMLElement, problem: { message: string; field?: string }): boolean {
  clearProblemMarks(root);
  const target = problem.field ? findField(root, problem.field) : null;
  if (!target) return false;
  target.classList.add("needs-fix");
  const msg = document.createElement("p");
  msg.className = "fix-msg";
  msg.setAttribute("role", "alert");
  msg.textContent = problem.message;
  // A field taller than most of the screen (a shelf of game cards) gets its message above it and is scrolled to its
  // top; centred, the middle of the shelf filled the screen and the message sat below the fold.
  const tall = target.getBoundingClientRect().height > window.innerHeight * 0.6;
  if (tall) target.before(msg); else target.after(msg);
  const clear = () => { target.classList.remove("needs-fix"); msg.remove(); };
  for (const type of ["input", "change", "click"]) target.addEventListener(type, clear, { once: true });
  (tall ? msg : target).scrollIntoView({ behavior: "smooth", block: tall ? "start" : "center" });
  const focusable = target.matches(FOCUSABLE) ? target : target.querySelector<HTMLElement>(FOCUSABLE);
  (focusable ?? target).focus({ preventScroll: true });
  return true;
}
