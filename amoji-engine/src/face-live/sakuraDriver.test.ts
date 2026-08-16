import { afterEach, describe, expect, it, vi } from "vitest";
import { SakuraFaceLiveDriver } from "./sakuraDriver.js";
import {
  startMockFaceLiveBridge,
  type MockFaceLiveBridge,
} from "./mockBridge.js";

describe("SakuraFaceLiveDriver", () => {
  let bridge: MockFaceLiveBridge | null = null;

  afterEach(async () => {
    if (bridge) {
      await bridge.close();
      bridge = null;
    }
  }, 3_000);

  it("completes VTS token → auth handshake against mock bridge", async () => {
    bridge = await startMockFaceLiveBridge();
    const driver = new SakuraFaceLiveDriver({
      url: bridge.url,
      authTimeoutMs: 2_000,
    });

    const authenticated = vi.fn();
    driver.on("authenticated", authenticated);

    await driver.connect();
    expect(driver.isAuthenticated).toBe(true);
    expect(authenticated).toHaveBeenCalledOnce();
    expect(bridge.authTokensIssued.length).toBe(1);
    expect(driver.authenticationToken).toBe(bridge.authTokensIssued[0]);

    await driver.setExpression("happy");
    await vi.waitFor(() => {
      expect(bridge!.injected.some((p) => p.id === "ParamMouthSmile")).toBe(
        true,
      );
    });

    const params = await driver.driveLipSync(new Int16Array(128).fill(12_000));
    expect(params[0]?.id).toBe("ParamMouthOpenY");
    expect(params[0]?.value).toBeGreaterThan(0);

    await driver.resetLipSync();
    driver.disconnect();
  });

  it("rejects when mock bridge denies authentication", async () => {
    bridge = await startMockFaceLiveBridge({ autoApprove: false });
    const driver = new SakuraFaceLiveDriver({
      url: bridge.url,
      authTimeoutMs: 2_000,
    });

    await expect(driver.connect()).rejects.toThrow(/rejected/i);
  });

  it("reuses a cached authentication token", async () => {
    bridge = await startMockFaceLiveBridge();
    const driver = new SakuraFaceLiveDriver({
      url: bridge.url,
      authenticationToken: "cached-token",
      authTimeoutMs: 2_000,
    });

    await driver.connect();
    expect(driver.isAuthenticated).toBe(true);
    // Cached token skips AuthenticationTokenRequest.
    expect(bridge.authTokensIssued.length).toBe(0);

    driver.disconnect();
  });

  it("reacts to Cantonese transcript keywords", async () => {
    bridge = await startMockFaceLiveBridge();
    const driver = new SakuraFaceLiveDriver({
      url: bridge.url,
      authTimeoutMs: 2_000,
    });
    await driver.connect();

    const expression = await driver.reactToTranscript("哈哈好開心呀");
    expect(expression).toBe("happy");

    driver.disconnect();
  });
});
