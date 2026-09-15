// The Worker's bindings and secrets (wrangler.jsonc). Every one is optional on purpose: the site deploys and
// serves pages before the owner has created the R2 bucket, the KV namespace or the Stripe/Resend accounts, and
// the order API answers 503 "not open yet" until they exist. Minimal hand-written types, so the project needs
// no extra type package.

export interface R2ObjectBody {
  key: string;
  size: number;
  httpMetadata?: { contentType?: string };
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
  list(options: { prefix: string; cursor?: string }): Promise<{ objects: { key: string; size: number }[]; truncated: boolean; cursor?: string }>;
}

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  ASSETS: Fetcher;
  /** Private bucket for order records and photos. */
  ORDERS?: R2Bucket;
  /** Founder counter and idempotency markers. */
  SHOP?: KVNamespace;
  /** Anonymous logo-vote records. Keep this separate from customer orders. */
  VOTES?: R2Bucket;
  /** Anonymous cart-test answers (cart-test.html). Its own bucket, for the same reason as VOTES. */
  CART_TESTS?: R2Bucket;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  /** Where new orders are emailed (the owner). */
  ORDER_EMAIL_TO?: string;
  /** e.g. "Game of Us <orders@yourdomain>"; must be a domain verified in Resend. */
  ORDER_EMAIL_FROM?: string;
  /** e.g. "https://gameofus.dk"; falls back to the request's own origin. */
  SITE_URL?: string;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}
