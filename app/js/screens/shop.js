import { registerRoute } from "../router.js";
import {
  fetchIapStoreMeta,
  iapLabel,
  purchaseDevStub,
  verifyPurchase,
} from "/amoji-engine/engine/mobile/companionIapCatalog.js";
import {
  ensureNativePurchasesConfigured,
  purchaseNativeStoreProduct,
} from "/amoji-engine/engine/mobile/companionNativePurchases.js";
import { loadAuthSession } from "/amoji-engine/engine/mobile/companionMobileAuth.js";
import { syncFromCloud } from "/amoji-engine/engine/mobile/companionCloudStorage.js";

registerRoute("shop", async (ctx) => {
  const en = ctx.isEnglish();
  const screen = document.createElement("section");
  screen.className = "screen";

  screen.innerHTML = `
    <div class="topbar">
      <button type="button" class="btn btn-secondary" data-action="back">←</button>
      <h1>${en ? "Shop" : "商店"}</h1>
      <span></span>
    </div>
    <div class="panel">
      <p style="margin:0;color:var(--muted)">${en ? "Loading products…" : "載入商品…"}</p>
    </div>
  `;

  screen.querySelector('[data-action="back"]')?.addEventListener("click", () => ctx.navigate("hub"));

  let products = [];
  let revenueCatEnabled = false;
  try {
    const meta = await fetchIapStoreMeta({ baseUrl: ctx.baseUrl });
    products = meta.products;
    revenueCatEnabled = Boolean(meta.revenueCat?.enabled && meta.revenueCat?.publicApiKey);
    if (revenueCatEnabled) {
      await ensureNativePurchasesConfigured({ baseUrl: ctx.baseUrl });
    }
  } catch (err) {
    screen.querySelector(".panel").innerHTML = `<p style="margin:0;color:var(--danger)">${err?.message || String(err)}</p>`;
    return screen;
  }

  const session = loadAuthSession();
  const premium = session?.entitlements?.premium;

  screen.querySelector(".panel").outerHTML = `
    <div class="shop-list" id="shop-list"></div>
    <p style="margin:1rem 0 0;color:var(--muted);font-size:0.78rem;line-height:1.45">${
      en
        ? "Production: RevenueCat + App Store Connect products. Browser uses dev verify."
        : "正式版用 RevenueCat + App Store Connect；瀏覽器用開發驗證。"
    }</p>
  `;

  const list = screen.querySelector("#shop-list");
  for (const product of products) {
    const row = document.createElement("div");
    row.className = "shop-item";
    row.innerHTML = `
      <div>
        <h3>${iapLabel(product.title, en)}</h3>
        <p>${iapLabel(product.blurb, en)}</p>
        <p style="margin-top:0.35rem;color:var(--gold)">$${product.priceUsd.toFixed(2)} · ${product.appleProductId}</p>
      </div>
      <button type="button" class="btn btn-primary" data-buy="${product.id}">${en ? "Buy" : "購買"}</button>
    `;
    list?.appendChild(row);
  }

  if (premium) {
    const badge = document.createElement("div");
    badge.className = "chip";
    badge.style.marginBottom = "0.75rem";
    badge.textContent = en ? "Premium active ✨" : "Premium 已啟用 ✨";
    list?.prepend(badge);
  }

  for (const btn of screen.querySelectorAll("[data-buy]")) {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-buy");
      if (!id) return;
      if (!loadAuthSession()?.token) {
        ctx.toast(en ? "Please sign in first" : "請先登入");
        ctx.navigate("login");
        return;
      }
      btn.setAttribute("disabled", "true");
      try {
        const product = products.find((p) => p.id === id);
        const nativeReady = await ensureNativePurchasesConfigured({ baseUrl: ctx.baseUrl });
        if (nativeReady && product?.appleProductId) {
          const result = await purchaseNativeStoreProduct(product);
          const tx =
            result?.transactionIdentifier ||
            result?.customerInfo?.originalAppUserId ||
            result?.productIdentifier ||
            product.appleProductId;
          await verifyPurchase(id, {
            baseUrl: ctx.baseUrl,
            receipt: tx,
            transactionId: tx,
            platform: globalThis.Capacitor?.getPlatform?.() === "android" ? "android" : "ios",
          });
        } else {
          await purchaseDevStub(id, { baseUrl: ctx.baseUrl });
        }
        await syncFromCloud({ baseUrl: ctx.baseUrl });
        const session = loadAuthSession();
        if (session?.entitlements) {
          ctx.setSession({ entitlements: session.entitlements });
        }
        ctx.toast(en ? "Purchase complete!" : "購買成功！");
        ctx.navigate("hub");
      } catch (err) {
        ctx.toast(err?.message || String(err));
      } finally {
        btn.removeAttribute("disabled");
      }
    });
  }

  return screen;
});
