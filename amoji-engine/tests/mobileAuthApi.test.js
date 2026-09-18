import { describe, expect, it } from "vitest";
import {
  createGuestSession,
  decodeAppleIdentityToken,
  signSession,
  verifySession,
} from "../../api/_lib/auth.mjs";
import { applyProductGrants, findProduct } from "../../api/_lib/iapCatalog.mjs";
import { defaultEntitlements, mergeSave } from "../../api/_lib/userStore.mjs";

describe("mobile auth api", () => {
  it("creates and verifies guest JWT", () => {
    const { token, userId } = createGuestSession("device-1");
    expect(userId).toMatch(/^guest_/);
    const payload = verifySession(token);
    expect(payload?.sub).toBe(userId);
    expect(payload?.provider).toBe("guest");
  });

  it("rejects tampered token", () => {
    const { token } = createGuestSession("device-2");
    const bad = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(verifySession(bad)).toBeNull();
  });

  it("decodes apple-like dev token payload", () => {
    const payloadPart = Buffer.from(JSON.stringify({ sub: "apple_test", email: "a@b.c" })).toString(
      "base64url",
    );
    const decoded = decodeAppleIdentityToken(`x.${payloadPart}.y`);
    expect(decoded?.appleSub).toBe("apple_test");
    expect(decoded?.email).toBe("a@b.c");
  });

  it("finds IAP product and applies grants", () => {
    const product = findProduct("com.amoji.coins.small");
    expect(product?.coins).toBe(120);
    const next = applyProductGrants(defaultEntitlements(), product);
    expect(next.coinPacksGranted).toBe(120);
  });

  it("mergeSave keeps character map", () => {
    const merged = mergeSave(
      { characters: { amoji: { bond: 1 } } },
      { characters: { kizuna: { bond: 2 } }, lastCharacterId: "kizuna" },
    );
    expect(merged.characters.amoji.bond).toBe(1);
    expect(merged.characters.kizuna.bond).toBe(2);
    expect(merged.lastCharacterId).toBe("kizuna");
  });
});
