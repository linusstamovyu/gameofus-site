// The two emails an order sends: one to the owner with everything needed to start, one to the customer.
// Plain text on purpose: it always renders, and customer-typed text can never become markup.
import { BIG_GAMES, MINIGAMES } from "../src/order/catalogue";
import { contextFromPayload, payloadUploads } from "../src/order/payload";
import { formatMoney } from "../src/order/prices";
import { SECTIONS } from "../src/order/sections";
import type { OrderRecord } from "./orders";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const box = (b: { x: number; y: number; width: number; height: number } | null) => (b ? `x${b.x} y${b.y} ${b.width}×${b.height}` : "not found");

export function ownerEmail(o: OrderRecord, siteUrl: string): { subject: string; text: string } {
  const p = o.payload;
  const kind = o.status === "requested" ? "REQUEST (custom game, needs a quote)" : "PAID";
  const lines = [
    `${kind} · ${cap(p.edition)} edition · ${formatMoney(o.quote.total, o.quote.currency)}${o.quote.founder ? " (founder price)" : ""}`,
    `Order ${o.id}`,
    "",
    `Organiser: ${p.organiser.name} <${p.organiser.email}>, country ${p.country}`,
    `What it's for: ${p.occasion ?? "not said"}`,
    p.partyMode ? `Party Mode: yes · birth year ${p.organiser.birthYear} · adults confirmed ${p.organiser.adultsConfirmed}` : "Party Mode: no",
    "",
    `Squad (${p.friends.length}): ${p.friends.map(f => f.name).join(", ")}`,
    `Big games: ${p.bigGames.map(id => BIG_GAMES.find(g => g.id === id)?.name ?? id).join(", ") || "none"}`,
    `Minigames: ${p.minigames.map(id => MINIGAMES.find(g => g.id === id)?.name ?? id).join(", ") || "none"}`,
    p.customGame ? `Custom game idea:\n${p.customGame}` : "",
    ...SECTIONS.flatMap(s => {
      const lines = s.summary(p.sections[s.id], contextFromPayload(p));
      return lines.length ? ["", `${s.label}:`, ...lines.map(l => `  ${l}`)] : [];
    }),
    payloadUploads(p).length ? `\nAttached files (orders/${o.id}/files/): ${payloadUploads(p).map(u => `${u.name} [${u.section}]`).join(", ")}` : "",
    p.flexPass ? "Flex Pass: yes" : "",
    p.directorsCut ? "Director's Cut: yes" : "",
    "",
    "Price lines:",
    ...o.quote.lines.map(l => `  ${l.label} × ${l.qty}: ${formatMoney(l.total, o.quote.currency)}`),
    "",
    `Photos are in the R2 bucket under orders/${o.id}/photos/ (one per friend, ${p.friends.length} files, named by friend id).`,
    ...p.friends.map(f => `  ${f.id} ${f.name}: ${f.photo ? `${f.photo.width}×${f.photo.height}, face ${box(f.photo.face)}, full body ${box(f.photo.body)}` : "no crop data"}`),
    "Next: send each friend the consent form before starting (templates/consent-form.md).",
    `Stripe session: ${o.stripeSessionId ?? "none"} · Site: ${siteUrl}`,
  ];
  return { subject: `New Game of Us order: ${cap(p.edition)} for ${p.organiser.name}`, text: lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n") };
}

export function customerEmail(o: OrderRecord): { subject: string; text: string } {
  const p = o.payload;
  const first = p.organiser.name.split(" ")[0];
  const paid = o.status === "paid";
  const text = [
    `Hi ${first},`,
    "",
    paid
      ? `Thank you for your order! Your ${cap(p.edition)} edition starring ${p.friends.map(f => f.name).join(", ")} is booked, and your receipt from Stripe is on its way separately.`
      : `Thank you for your request! Because it includes a game of your own design, we'll reply within two days with a quote and a payment link. Nothing has been charged.`,
    "",
    "What happens next:",
    "1. Each friend in the game gets a short consent form from us. We start once everyone has signed.",
    "2. You'll see your characters within 5 days of us having everything. Love the preview or get your money back.",
    `3. Then we build it. Your changes rounds are included.`,
    "",
    `Your order reference: ${o.id.slice(0, 8).toUpperCase()}`,
    "Just reply to this email if anything's wrong or you want to add something.",
    "",
    "Game of Us",
  ].join("\n");
  return { subject: paid ? "Your Game of Us order is booked" : "We've got your Game of Us request", text };
}

export async function sendEmail(apiKey: string, from: string, to: string, email: { subject: string; text: string }, replyTo?: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: email.subject, text: email.text, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text()}`);
}
