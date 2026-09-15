// Dev-only page script for /font-lab.html: every candidate numbers font, drawn over the order page's
// real number spots at their real sizes. Not a build input.

type Candidate = { name: string; stack: string; note: string; size?: number };

const CANDIDATES: Candidate[] = [
  { name: "Pixelify Sans", stack: `"Pixelify Sans",monospace`, note: "Baseline. Lovely on words, but at price sizes 2 reads as 8, 3 as 9, 5 as 8 and € as 0." },
  { name: "Chakra Petch", stack: `"Chakra Petch",sans-serif`, note: "PICK. Squared game-HUD digits, unambiguous at 13–30px, same width as Pixelify so no layout changes." },
  { name: "Jersey 10", stack: `"Jersey 10",sans-serif`, note: "Closest pixel feel with clear digits, but small and condensed: every size needs ~1.2x.", size: 1.3 },
  { name: "Fredoka", stack: `"Fredoka",sans-serif`, note: "Very legible and playful, but its round shapes fight the square pixel headings." },
  { name: "Bungee", stack: `"Bungee",sans-serif`, note: "Clear signage digits, but loud and wide; shouts over the heading.", size: 0.8 },
  { name: "Space Mono", stack: `"Space Mono",monospace`, note: "Monospaced and clear, but reads as code, not game." },
  { name: "VT323", stack: `"VT323",monospace`, note: "Clear terminal digits, but thin and light; weak on the sticky bar.", size: 1.25 },
  { name: "Handjet", stack: `"Handjet",sans-serif`, note: "Fun dot-matrix, but at 13–15px 5 reads as 8 and 10 as 18.", size: 1.2 },
  { name: "Silkscreen", stack: `"Silkscreen",monospace`, note: "Crisp pixel font, but very wide and its 4 is odd; prices overflow cards." },
  { name: "Press Start 2P", stack: `"Press Start 2P",monospace`, note: "Arcade classic, but so wide it has to be shrunk to fit.", size: 0.62 },
  { name: "Tiny5", stack: `"Tiny5",sans-serif`, note: "Neat grid, but same trap as Pixelify: 3/9, 2 and € blur.", size: 1.15 },
];

const PIXEL = `"Pixelify Sans",monospace`;
let mode: "hybrid" | "all" = "hybrid";

function h(tag: string, cls: string | null, html = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.innerHTML = html;
  return e;
}

function row(c: Candidate, i: number): HTMLElement {
  const r = h("section", i === 0 ? "row base" : "row");
  const k = c.size ?? 1;
  r.style.setProperty("--num", c.stack);
  r.style.setProperty("--word", mode === "all" ? c.stack : PIXEL);
  r.style.setProperty("--k", String(k));

  const who = h("div", "who");
  who.append(h("span", "rank", i === 0 ? "baseline" : `#${i}`), h("b", null, c.name), h("p", null, c.note + (k !== 1 ? ` Shown ×${k} to match optical size.` : "")));
  who.querySelector("b")!.style.fontFamily = c.stack;

  const demo = h("div", "demo");
  const card = (edition: string, price: string, normal: string, per: string) => {
    const el = h("div", "card");
    el.innerHTML = `<span class="head word">${edition}</span><span class="price"><strong><span class="num">${price}</span></strong> <s><span class="num">${normal}</span></s></span><span class="small">≈ <span class="num">${per}</span> per friend</span>`;
    return el;
  };
  demo.append(
    card("Deluxe", "1,299 DKK", "1,699 DKK", "217 DKK"),
    card("Deluxe", "£149.99", "£199.99", "£25"),
    card("Ultimate", "€174.99", "€229.99", "€18"),
  );
  const col = h("div", "col");
  const bar = h("div", "bar", `<span class="bar-main"><strong><span class="num">£149.99</span></strong> <s><span class="num">£199.99</span></s></span><span class="lab">Your total · founder price</span>`);
  const founder = h("p", "founder", `Founder prices: <span class="num">23</span> of <span class="num">50</span> spots left.`);
  const steps = h("ol", "steps");
  for (let n = 1; n <= 10; n++) {
    const li = h("li", n < 4 ? "done" : n === 4 ? "on" : null, `<span class="num">${n}</span>`);
    steps.append(li);
  }
  const chip = h("span", "chip", `<span class="num">×6</span> characters · <span class="num">3/4</span> big games`);
  col.append(bar, founder, steps, chip);
  demo.append(col);
  r.append(who, demo);
  return r;
}

function render(): void {
  const host = document.getElementById("rows")!;
  host.replaceChildren(...CANDIDATES.map(row));
}

document.querySelectorAll<HTMLButtonElement>(".toggle button").forEach(b => b.addEventListener("click", () => {
  mode = b.dataset.mode === "all" ? "all" : "hybrid";
  document.querySelectorAll(".toggle button").forEach(x => x.classList.toggle("on", x === b));
  render();
}));
render();
