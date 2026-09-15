import { describe, expect, it } from "vitest";
import { COUNTRIES, currencyFor, flag, guessCountry, normaliseCountry } from "../src/shared/country";

describe("country and currency", () => {
  it("prices Denmark in DKK, the UK in GBP and everywhere else in EUR", () => {
    expect(currencyFor("DK")).toBe("DKK");
    expect(currencyFor("GB")).toBe("GBP");
    for (const c of COUNTRIES.filter(c => !["DK", "GB"].includes(c.code))) expect(currencyFor(c.code), c.code).toBe("EUR");
  });

  it("trusts the edge country first, then the browser's language region, then Denmark", () => {
    expect(guessCountry("GB", ["da-DK"])).toBe("GB");
    expect(guessCountry(null, ["en-GB", "da"])).toBe("GB");
    expect(guessCountry(null, ["da"])).toBe("DK");
    expect(guessCountry(null, ["en-US"])).toBe("XX"); // a real country not on the list → Elsewhere (EUR)
    expect(guessCountry(null, ["en"])).toBe("DK");
    expect(guessCountry("T1", [])).toBe("DK"); // Cloudflare's Tor code is not a country
  });

  it("normalises codes onto the picker's list", () => {
    expect(normaliseCountry("uk")).toBe("GB");
    expect(normaliseCountry("de")).toBe("DE");
    expect(normaliseCountry("JP")).toBe("XX");
    expect(normaliseCountry("")).toBeNull();
  });

  it("draws a flag for a country and a globe for elsewhere", () => {
    expect(flag("DK")).toBe("🇩🇰");
    expect(flag("XX")).toBe("🌍");
  });
});
