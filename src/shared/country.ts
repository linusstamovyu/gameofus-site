// Which country the visitor shops from, and so which currency they see (plan 03, owner decisions P23–P25).
// Pure rules here; the picker UI is countryPicker.ts. Denmark → DKK, the UK → GBP, everywhere else → EUR,
// each with its own fixed ladder in src/order/prices.ts (never a live conversion).
import type { Currency } from "../order/prices";

export interface Country {
  code: string;
  name: string;
}

/** The countries named in the picker. Anything else is "Elsewhere", which pays in euros. */
export const COUNTRIES: Country[] = [
  { code: "DK", name: "Denmark" },
  { code: "GB", name: "United Kingdom" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "IT", name: "Italy" },
  { code: "IE", name: "Ireland" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "XX", name: "Elsewhere" },
];

export const DEFAULT_COUNTRY = "DK";
const KNOWN = new Set(COUNTRIES.map(c => c.code));

export function currencyFor(code: string): Currency {
  if (code === "DK") return "DKK";
  if (code === "GB") return "GBP";
  return "EUR";
}

export function countryName(code: string): string {
  return COUNTRIES.find(c => c.code === code)?.name ?? "Elsewhere";
}

/** 🇩🇰 from "DK". "Elsewhere" gets a globe. */
export function flag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return "🌍";
  return String.fromCodePoint(...[...code].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** A country code normalised onto the picker's list. */
export function normaliseCountry(code: string | null | undefined): string | null {
  if (!code) return null;
  const up = code.toUpperCase();
  if (up === "UK") return "GB";
  if (KNOWN.has(up)) return up;
  return /^[A-Z]{2}$/.test(up) ? "XX" : null;
}

/**
 * The best guess before the visitor has said anything: the country Cloudflare saw the request come
 * from, else the region in the browser's languages ("en-GB" → GB, a bare "da" → DK), else Denmark.
 */
export function guessCountry(edgeCountry: string | null, languages: readonly string[]): string {
  const edge = normaliseCountry(edgeCountry);
  if (edge) return edge;
  for (const lang of languages) {
    const region = lang.split("-")[1];
    const fromRegion = normaliseCountry(region);
    if (fromRegion) return fromRegion;
    const base = lang.split("-")[0].toLowerCase();
    if (base === "da") return "DK";
    if (base === "sv") return "SE";
    if (base === "nb" || base === "nn" || base === "no") return "NO";
  }
  return DEFAULT_COUNTRY;
}
