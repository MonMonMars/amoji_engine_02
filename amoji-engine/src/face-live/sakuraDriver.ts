import {
  inferExpressionFromText,
  lipSyncParameters,
  SAKURA_EXPRESSION_PRESETS,
} from "./expressions.js";
import {
  presenceToFaceLiveParams,
  type IdlePresenceSample,
} from "./idlePresence.js";
import {
  TalkGestureClock,
  createTalkGestureClock,
  talkGestureToFaceLiveParams,
  mergeFaceLiveParams,
  type TalkGestureSample,
} from "./talkGestures.js";
import type {
  ConnectionState,
  FaceLiveParameter,
  SakuraExpression,
} from "../types.js";

type WebSocketLike = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: unknown) => void,
  ): void;
};

const WS_OPEN = 1;
const VTS_API = "VTubeStudioPublicAPI";
const VTS_VERSION = "1.0";

export interface SakuraFaceLiveOptions {
  url?: string;
  pluginName?: string;
  pluginDeveloper?: string;
  /** Cached auth token from a previous AuthenticationTokenResponse. */
  authenticationToken?: string;
  /** Lip-sync smoothing alpha (0–1). Higher = snappier. */
  lipSyncAlpha?: number;
  /** Auth handshake timeout in ms (default 8000). */
  authTimeoutMs?: number;
  createWebSocket?: (url: string) => WebSocketLike;
}

export interface FaceLiveDriverEvents {
  connected: void;
  disconnected: { code: number; reason: string };
  authenticated: void;
  state: ConnectionState;
  error: { message: string; cause?: unknown };
  parametersInjected: FaceLiveParameter[];
}

export type FaceLiveEventName = keyof FaceLiveDriverEvents;
export type FaceLiveListener<K extends FaceLiveEventName> = (
  payload: FaceLiveDriverEvents[K],
) => void;

/**
 * WebSocket driver for Sakura Face Live.
 *
 * Speaks a VTube Studio–compatible subset:
 * 1. AuthenticationTokenRequest (or reuse cached token)
 * 2. AuthenticationRequest with the token
 * 3. InjectParameterDataRequest for Live2D control
 */
export class SakuraFaceLiveDriver {
  private readonly url: string;
  private readonly pluginName: string;
  private readonly pluginDeveloper: string;
  private readonly lipSyncAlpha: number;
  private readonly authTimeoutMs: number;
  private readonly createWebSocket: SakuraFaceLiveOptions["createWebSocket"];
  private socket: WebSocketLike | null = null;
  private authenticated = false;
  private authToken: string | null;
  private currentExpression: SakuraExpression = "neutral";
  private previousMouthOpen = 0;
  private readonly talkGestures: TalkGestureClock;
  private requestId = 0;
  private authResolve: (() => void) | null = null;
  private authReject: ((error: Error) => void) | null = null;
  private readonly listeners = new Map<
    FaceLiveEventName,
    Set<FaceLiveListener<FaceLiveEventName>>
  >();

  constructor(options: SakuraFaceLiveOptions = {}) {
    this.url = options.url ?? "ws://127.0.0.1:8765";
    this.pluginName = options.pluginName ?? "Amoji Engine";
    this.pluginDeveloper = options.pluginDeveloper ?? "MonMonMars";
    this.lipSyncAlpha = options.lipSyncAlpha ?? 0.45;
    this.authTimeoutMs = options.authTimeoutMs ?? 8_000;
    this.authToken = options.authenticationToken ?? null;
    this.createWebSocket = options.createWebSocket;
    this.talkGestures = createTalkGestureClock({ style: "explain", intensity: 0.72 });
  }

  on<K extends FaceLiveEventName>(
    event: K,
    listener: FaceLiveListener<K>,
  ): () => void {
    const bucket =
      this.listeners.get(event) ??
      new Set<FaceLiveListener<FaceLiveEventName>>();
    bucket.add(listener as FaceLiveListener<FaceLiveEventName>);
    this.listeners.set(event, bucket);
    return () => bucket.delete(listener as FaceLiveListener<FaceLiveEventName>);
  }

  get connected(): boolean {
    return this.socket?.readyState === WS_OPEN;
  }

  get isAuthenticated(): boolean {
    return this.authenticated;
  }

  get expression(): SakuraExpression {
    return this.currentExpression;
  }

  get authenticationToken(): string | null {
    return this.authToken;
  }

  async connect(): Promise<void> {
    if (this.connected && this.authenticated) return;
    this.emitState("connecting");

    const socket = this.createWebSocket
      ? this.createWebSocket(this.url)
      : await createDefaultWebSocket(this.url);

    this.socket = socket;
    await waitForOpen(socket);
    this.emit("connected", undefined);
    this.emitState("connected");
    this.attachHandlers(socket);
    await this.authenticate();
  }

  disconnect(): void {
    this.socket?.close(1000, "client disconnect");
    this.socket = null;
    this.authenticated = false;
    this.previousMouthOpen = 0;
    this.rejectAuth(new Error("Disconnected during authentication"));
    this.emitState("disconnected");
  }

  /** Apply a named Sakura expression preset. */
  async setExpression(expression: SakuraExpression): Promise<void> {
    this.currentExpression = expression;
    await this.injectParameters(SAKURA_EXPRESSION_PRESETS[expression]);
  }

  /** Drive lip-sync from assistant TTS PCM16 audio with smoothing. */
  async driveLipSync(pcm16: Int16Array): Promise<FaceLiveParameter[]> {
    const parameters = lipSyncParameters(pcm16, {
      previousMouthOpen: this.previousMouthOpen,
      alpha: this.lipSyncAlpha,
    });
    const mouth = parameters.find((p) => p.id === "ParamMouthOpenY");
    if (mouth) this.previousMouthOpen = mouth.value;
    const speechEnergy = mouth?.value ?? this.previousMouthOpen;
    if (this.talkGestures.active) {
      const sample = this.talkGestures.step(1 / 30, { speechEnergy });
      const merged = mergeFaceLiveParams(
        parameters,
        talkGestureToFaceLiveParams(sample),
      );
      await this.injectParameters(merged);
      return merged;
    }
    await this.injectParameters(parameters);
    return parameters;
  }

  /** Reset mouth to closed (call when assistant speech ends). */
  async resetLipSync(): Promise<void> {
    this.previousMouthOpen = 0;
    this.talkGestures.stop();
    await this.injectParameters([
      { id: "ParamMouthOpenY", value: 0 },
      { id: "ParamMouthSmile", value: 0.15 },
    ]);
  }

  /**
   * Drive subtle idle / listen presence morphs (breath, blink, look).
   * Call from a rAF / clock while not speaking.
   */
  async driveIdlePresence(
    presence: IdlePresenceSample,
  ): Promise<FaceLiveParameter[]> {
    const parameters = presenceToFaceLiveParams(presence);
    await this.injectParameters(parameters);
    return parameters;
  }

  /**
   * Start / update Disney-style talk gestures from assistant reply text.
   * Gesture params merge into subsequent `driveLipSync` injects.
   */
  beginTalkGesture(
    text: string,
    opts: { emotion?: string; intensity?: number } = {},
  ): string {
    return this.talkGestures.start(text, opts);
  }

  /** Stop talk-gesture clock (keeps soft pose until next start). */
  stopTalkGesture(): void {
    this.talkGestures.stop();
  }

  get talkGestureClock(): TalkGestureClock {
    return this.talkGestures;
  }

  /**
   * Sample and inject talk-gesture params (body / hands / fingertips).
   * Prefer `beginTalkGesture` + `driveLipSync` merge while TTS is playing.
   */
  async driveTalkGesture(
    dtSec = 1 / 30,
    frame: { speechEnergy?: number } = {},
  ): Promise<{ sample: TalkGestureSample; parameters: FaceLiveParameter[] }> {
    const sample = this.talkGestures.step(dtSec, frame);
    const parameters = talkGestureToFaceLiveParams(sample);
    await this.injectParameters(parameters);
    return { sample, parameters };
  }

  /** Infer and apply expression from transcript text. */
  async reactToTranscript(text: string): Promise<SakuraExpression> {
    const expression = inferExpressionFromText(text);
    await this.setExpression(expression);
    return expression;
  }

  /** Inject arbitrary Live2D parameters. */
  async injectParameters(parameters: FaceLiveParameter[]): Promise<void> {
    if (!this.connected || !this.authenticated) return;
    this.send({
      apiName: VTS_API,
      apiVersion: VTS_VERSION,
      requestID: this.nextRequestId(),
      messageType: "InjectParameterDataRequest",
      data: {
        faceFound: true,
        mode: "set",
        parameterValues: parameters.map((p) => ({
          id: p.id,
          value: p.value,
        })),
      },
    });
    this.emit("parametersInjected", parameters);
  }

  private async authenticate(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.authResolve = resolve;
      this.authReject = reject;

      const timeout = setTimeout(() => {
        this.rejectAuth(new Error("Face Live authentication timed out"));
      }, this.authTimeoutMs);

      const clear = () => clearTimeout(timeout);
      const originalResolve = this.authResolve;
      const originalReject = this.authReject;
      this.authResolve = () => {
        clear();
        originalResolve?.();
      };
      this.authReject = (error) => {
        clear();
        originalReject?.(error);
      };

      if (this.authToken) {
        this.sendAuthenticationRequest(this.authToken);
      } else {
        this.send({
          apiName: VTS_API,
          apiVersion: VTS_VERSION,
          requestID: this.nextRequestId(),
          messageType: "AuthenticationTokenRequest",
          data: {
            pluginName: this.pluginName,
            pluginDeveloper: this.pluginDeveloper,
            pluginIcon: "",
          },
        });
      }
    });
  }

  private sendAuthenticationRequest(token: string): void {
    this.send({
      apiName: VTS_API,
      apiVersion: VTS_VERSION,
      requestID: this.nextRequestId(),
      messageType: "AuthenticationRequest",
      data: {
        pluginName: this.pluginName,
        pluginDeveloper: this.pluginDeveloper,
        authenticationToken: token,
      },
    });
  }

  private attachHandlers(socket: WebSocketLike): void {
    socket.addEventListener("message", (event: unknown) => {
      this.handleMessage(extractSocketData(event));
    });

    socket.addEventListener("close", (event: unknown) => {
      const closeEvent = event as CloseEvent;
      this.authenticated = false;
      this.rejectAuth(new Error("Face Live closed during authentication"));
      this.emit("disconnected", {
        code: closeEvent.code ?? 1006,
        reason: closeEvent.reason ?? "",
      });
      this.emitState("disconnected");
      this.socket = null;
    });

    socket.addEventListener("error", () => {
      this.emit("error", { message: "Face Live WebSocket error" });
      this.emitState("error");
    });
  }

  private handleMessage(raw: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.emit("error", { message: "Invalid JSON from Face Live bridge" });
      return;
    }

    const messageType = String(message.messageType ?? "");
    const data = (message.data ?? {}) as Record<string, unknown>;

    switch (messageType) {
      case "AuthenticationTokenResponse": {
        const token = String(data.authenticationToken ?? "");
        if (!token) {
          this.rejectAuth(new Error("Face Live returned empty auth token"));
          break;
        }
        this.authToken = token;
        this.sendAuthenticationRequest(token);
        break;
      }
      case "AuthenticationResponse": {
        if (data.authenticated === true) {
          this.authenticated = true;
          this.emit("authenticated", undefined);
          this.authResolve?.();
          this.authResolve = null;
          this.authReject = null;
        } else {
          this.authToken = null;
          const reason = String(
            data.reason ?? "Face Live authentication rejected",
          );
          this.rejectAuth(new Error(reason));
          this.socket?.close(1000, "auth rejected");
          this.socket = null;
          this.authenticated = false;
        }
        break;
      }
      case "APIError": {
        this.emit("error", {
          message: String(data.message ?? "Face Live API error"),
        });
        break;
      }
      default:
        break;
    }
  }

  private nextRequestId(): string {
    this.requestId += 1;
    return `amoji-${this.requestId}`;
  }

  private rejectAuth(error: Error): void {
    if (!this.authReject) return;
    this.authReject(error);
    this.authResolve = null;
    this.authReject = null;
  }

  private send(payload: Record<string, unknown>): void {
    this.socket?.send(JSON.stringify(payload));
  }

  private emitState(state: ConnectionState): void {
    this.emit("state", state);
  }

  private emit<K extends FaceLiveEventName>(
    event: K,
    payload: FaceLiveDriverEvents[K],
  ): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    for (const listener of bucket) {
      (listener as FaceLiveListener<K>)(payload);
    }
  }
}

async function createDefaultWebSocket(url: string): Promise<WebSocketLike> {
  if (typeof globalThis.WebSocket !== "undefined") {
    return new globalThis.WebSocket(url) as unknown as WebSocketLike;
  }
  const { default: WS } = await import("ws");
  return new WS(url) as unknown as WebSocketLike;
}

function waitForOpen(socket: WebSocketLike): Promise<void> {
  if (socket.readyState === WS_OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onOpen = () => resolve();
    const onError = () => reject(new Error("Face Live WebSocket failed"));
    socket.addEventListener("open", onOpen);
    socket.addEventListener("error", onError);
  });
}

/** Normalize browser MessageEvent / Node `ws` Buffer payloads to a string. */
function extractSocketData(event: unknown): string {
  const data = (event as { data?: unknown })?.data ?? event;
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data);
  }
  if (data && typeof (data as { toString?: unknown }).toString === "function") {
    return (data as { toString: () => string }).toString();
  }
  return String(data);
}
