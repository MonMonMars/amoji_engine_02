import { describe, expect, it, beforeEach } from "vitest";
import { createGuestSession, verifySession } from "../../api/_lib/auth.mjs";
import {
  assertPurchaseReceiptAllowed,
  checkRateLimit,
  isReceiptAlreadyFulfilled,
  isReceiptReplay,
  markReceiptUsed,
  receiptFingerprint,
  securityHeaders,
} from "../../api/_lib/security.mjs";
import { fulfillProductPurchase, resolveProduct } from "../../api/_lib/iapFulfillment.mjs";

describe("iap security", () => {
  it("exposes security headers", () => {
    expect(securityHeaders()["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("blocks dev receipts when AMOJI_IAP_DEV is off", () => {
    const prev = process.env.AMOJI_IAP_DEV;
    process.env.AMOJI_IAP_DEV = "0";
    expect(assertPurchaseReceiptAllowed("dev_coins_small_1").ok).toBe(false);
    expect(assertPurchaseReceiptAllowed("store_tx_abc").ok).toBe(true);
    process.env.AMOJI_IAP_DEV = prev;
  });

  it("tracks receipt replay across accounts", () => {
    const fp = receiptFingerprint("tx-1", "coins_small", "user_a");
    markReceiptUsed(fp, "user_a");
    expect(isReceiptAlreadyFulfilled(fp, "user_a")).toBe(true);
    expect(isReceiptReplay(fp, "user_b")).toBe(true);
  });

  it("rate limits repeated requests", () => {
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(req, "test-bucket", { max: 5, windowMs: 60_000 }).ok).toBe(true);
    }
    expect(checkRateLimit(req, "test-bucket", { max: 5, windowMs: 60_000 }).ok).toBe(false);
  });
});

describe("iap fulfillment", () => {
  it("grants coins on consumable purchase", async () => {
    const { userId, token } = createGuestSession("pay-test");
    expect(verifySession(token)?.sub).toBe(userId);
    const product = resolveProduct("coins_small");
    expect(product).toBeTruthy();
    const next = await fulfillProductPurchase(userId, product, {
      receipt: `test_${Date.now()}`,
      source: "vitest",
    });
    expect(next.entitlements.coinPacksGranted).toBeGreaterThan(0);
    expect(next.save?.treats?.coins).toBeGreaterThan(80);
  });
});
