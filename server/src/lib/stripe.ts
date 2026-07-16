import Stripe from "stripe";

let cached: Stripe | null | undefined;

/**
 * Lazily builds the Stripe client from STRIPE_SECRET_KEY. Returns null if the
 * key isn't set, so the server can run fine (cash-on-delivery only) without
 * Stripe configured — card checkout routes just respond 503 in that case.
 */
export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}
