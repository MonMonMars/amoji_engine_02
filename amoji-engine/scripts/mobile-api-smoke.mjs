#!/usr/bin/env node
/**
 * Smoke test mobile auth + save + IAP logic (no server required).
 */
import { createGuestSession, verifySession } from "../../api/_lib/auth.mjs";
import {
  applyProductGrants,
  findProduct,
} from "../../api/_lib/iapCatalog.mjs";
import {
  defaultEntitlements,
  getUserRecord,
  mergeSave,
  patchUserRecord,
} from "../../api/_lib/userStore.mjs";

process.env.AMOJI_IAP_DEV = "1";
process.env.AMOJI_USER_STORE_FS = "1";

async function main() {
  const { userId, token } = createGuestSession("smoke");
  const payload = verifySession(token);
  if (!payload?.sub) throw new Error("JWT verify failed");

  await getUserRecord(userId);
  const patched = await patchUserRecord(userId, {
    save: mergeSave({}, { chase: { highScore: 42 }, treats: { coins: 100 } }),
  });
  if (patched.save?.chase?.highScore !== 42) throw new Error("save patch failed");

  const product = findProduct("coins_small");
  const entitlements = applyProductGrants(defaultEntitlements(), product);
  if (entitlements.coinPacksGranted !== 120) throw new Error("IAP grant failed");

  console.log("mobile-api-smoke OK", { userId, build: "v213" });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
