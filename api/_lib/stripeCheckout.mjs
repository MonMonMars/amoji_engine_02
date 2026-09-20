/**
 * Stripe Checkout via REST (no SDK) — optional web payments for companion / app shell.
 */

/**
 * @returns {string | null}
 */
export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || null;
}

/**
 * @returns {boolean}
 */
export function stripeEnabled() {
  return Boolean(stripeSecretKey());
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} body
 */
async function stripeRequest(path, body) {
  const key = stripeSecretKey();
  if (!key) throw new Error("Stripe not configured");
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      for (const [sk, sv] of Object.entries(v)) {
        params.set(`${k}[${sk}]`, String(sv));
      }
    } else {
      params.set(k, String(v));
    }
  }
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Stripe HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * @param {string} sessionId
 */
export async function retrieveCheckoutSession(sessionId) {
  const key = stripeSecretKey();
  if (!key || !sessionId) throw new Error("Invalid Stripe session");
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe HTTP ${res.status}`);
  }
  return data;
}

/**
 * @param {{
 *   productId: string,
 *   userId: string,
 *   priceUsd: number,
 *   titleEn: string,
 *   successUrl: string,
 *   cancelUrl: string,
 * }} opts
 */
export async function createCheckoutSession(opts) {
  const unitAmount = Math.round(Number(opts.priceUsd) * 100);
  if (!Number.isFinite(unitAmount) || unitAmount < 50) {
    throw new Error("Invalid product price");
  }
  return stripeRequest("checkout/sessions", {
    mode: "payment",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.userId,
    metadata: {
      productId: opts.productId,
      userId: opts.userId,
    },
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": unitAmount,
    "line_items[0][price_data][product_data][name]": opts.titleEn,
  });
}
