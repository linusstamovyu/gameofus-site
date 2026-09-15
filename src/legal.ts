import "./styles.css";
import siteData from "./content/site.json";
import type { SiteConfig } from "./content/types";

const site = siteData as SiteConfig;
// Contact details are filled in from site.json once they exist; until then the gap is visible.
document.querySelectorAll<HTMLElement>("[data-email]").forEach(n => {
  n.textContent = site.contactEmail || "[contact email: to be added before launch]";
});
document.querySelectorAll<HTMLElement>("[data-draft]").forEach(n => (n.hidden = !site.isDraft));
