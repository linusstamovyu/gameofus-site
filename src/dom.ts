/** Build an element with text set via textContent (content never becomes markup). */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string | null, text?: string): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

export const asset = (file: string) => `assets/${file}`;

export const formatDkk = (n: number) => n.toLocaleString("en-US");

/** "Real photo → In game" pair. Pass no photo and only the portrait is shown. */
export function photoPair(name: string, face: string, photo?: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (photo) {
    const fig = el("figure", "ref");
    const img = el("img");
    img.src = asset(photo); img.alt = `${name} in real life`; img.loading = "lazy";
    fig.append(img, el("figcaption", null, "Real photo"));
    const arrow = el("span", "ref-arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    frag.append(fig, arrow);
    // A photo that fails to load removes itself rather than leaving an empty frame.
    img.addEventListener("error", () => { fig.remove(); arrow.remove(); });
  }
  const f = el("img", "face");
  f.src = asset(face); f.alt = `${name} in the game`; f.loading = "lazy";
  frag.append(f);
  return frag;
}
