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

    const idleParams = await driver.driveIdlePresence({
      jawOpen: 0.05,
      blink: 0.2,
      lookX: 0.1,
      lookY: -0.05,
      emotion: "neutral",
      morphs: { jawOpen: 0.05, eyeBlink: 0.2, browInnerUp: 0.08 },
    });
    expect(idleParams.some((p) => p.id === "ParamEyeLOpen")).toBe(true);
    expect(idleParams.find((p) => p.id === "ParamEyeLOpen")?.value).toBeCloseTo(
      0.8,
      3,
    );

    const style = driver.beginTalkGesture("睇下呢個！");
    expect(style).toBe("point");
    const gesture = await driver.driveTalkGesture(0.05, { speechEnergy: 0.6 });
    expect(gesture.sample.pose.fingerRIndexTip).toBeGreaterThan(0.8);
    expect(
      gesture.parameters.some((p) => p.id === "ParamFingerRIndexTip"),
    ).toBe(true);

    const merged = await driver.driveLipSync(new Int16Array(128).fill(12_000));
    expect(merged.some((p) => p.id === "ParamMouthOpenY")).toBe(true);
    expect(merged.some((p) => p.id === "ParamFingerRIndexTip")).toBe(true);

    await driver.resetLipSync();
    expect(driver.talkGestureClock.active).toBe(false);
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
