// Page analytics (plan 18 §8): PostHog, cookieless. Nothing loads and every call is a no-op until site.json has an
// analyticsToken, so the site works the same with no account. `persistence: "memory"` keeps it off cookies and
// storage, which is what lets us skip a consent banner: funnels work within one visit, nothing links visits.
import siteData from "../content/site.json";
import type { SiteConfig } from "../content/types";

const site = siteData as SiteConfig;

type Props = Record<string, string | number | boolean | null>;
interface PostHog {
  init(token: string, opts: Record<string, unknown>): void;
  capture(event: string, props?: Props): void;
}

let queue: [string, Props | undefined][] = [];
let ph: PostHog | null = null;
let started = false;

function start() {
  if (started || !site.analyticsToken || typeof document === "undefined") return;
  started = true;
  const host = site.analyticsHost || "https://eu.i.posthog.com";
  const s = document.createElement("script");
  s.async = true;
  s.src = host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
  s.onload = () => {
    const w = window as unknown as { posthog?: PostHog };
    if (!w.posthog) return;
    ph = w.posthog;
    ph.init(site.analyticsToken, { api_host: host, persistence: "memory", autocapture: false, capture_pageview: true, disable_session_recording: true });
    for (const [e, p] of queue) ph.capture(e, p);
    queue = [];
  };
  document.head.append(s);
}

/** Record one event. Safe to call anywhere, before the script loads, or with no token at all. */
export function track(event: string, props?: Props): void {
  if (!site.analyticsToken) return;
  start();
  if (ph) ph.capture(event, props);
  else if (queue.length < 100) queue.push([event, props]);
}

/** Every element with data-track="event" (and optional data-track-*) reports its clicks. */
export function trackClicks(root: ParentNode = document): void {
  root.addEventListener("click", e => {
    const t = (e.target as Element | null)?.closest<HTMLElement>("[data-track]");
    if (!t) return;
    const props: Props = {};
    for (const [k, v] of Object.entries(t.dataset)) if (k.startsWith("track") && k !== "track" && v != null) props[k.slice(5).toLowerCase()] = v;
    track(t.dataset.track!, props);
  });
}
