import {
  inferExpressionFromText,
  lipSyncParameters,
  SAKURA_EXPRESSION_PRESETS,
} from "./expressions.js";
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

export interface SakuraFaceLiveOptions {
  url?: string;
  pluginName?: string;
  pluginDeveloper?: string;
  createWebSocket?: (url: string) => WebSocketLike;
}

export interface FaceLiveDriverEvents {
  connected: void;
  disconnected: { code: number; reason: string };
  authenticated: void;
  state: ConnectionState;
  error: { message: string; cause?: unknown };
}

export type FaceLiveEventName = keyof FaceLiveDriverEvents;
export type FaceLiveListener<K extends FaceLiveEventName> = (
  payload: FaceLiveDriverEvents[K],
) => void;

/**
 * WebSocket driver for Sakura Face Live.
 *
 * Speaks a VTube Studio–compatible subset: authentication handshake followed
 * by InjectParameterDataRequest messages for Live2D parameter control.
 */
export class SakuraFaceLiveDriver {
  private readonly url: string;
  private readonly pluginName: string;
  private readonly pluginDeveloper: string;
  private readonly createWebSocket: SakuraFaceLiveOptions["createWebSocket"];
  private socket: WebSocketLike | null = null;
  private authenticated = false;
  private currentExpression: SakuraExpression = "neutral";
  private readonly listeners = new Map<
    FaceLiveEventName,
    Set<FaceLiveListener<FaceLiveEventName>>
  >();

  constructor(options: SakuraFaceLiveOptions = {}) {
    this.url = options.url ?? "ws://127.0.0.1:8765";
    this.pluginName = options.pluginName ?? "Amoji Engine";
    this.pluginDeveloper = options.pluginDeveloper ?? "MonMonMars";
    this.createWebSocket = options.createWebSocket;
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

  async connect(): Promise<void> {
    if (this.connected) return;
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
    this.emitState("disconnected");
  }

  /** Apply a named Sakura expression preset. */
  async setExpression(expression: SakuraExpression): Promise<void> {
    this.currentExpression = expression;
    await this.injectParameters(SAKURA_EXPRESSION_PRESETS[expression]);
  }

  /** Drive lip-sync from assistant TTS PCM16 audio. */
  async driveLipSync(pcm16: Int16Array): Promise<void> {
    await this.injectParameters(lipSyncParameters(pcm16));
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
      apiName: "VTubeStudioPublicAPI",
      apiVersion: "1.0",
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
  }

  private async authenticate(): Promise<void> {
    this.send({
      apiName: "VTubeStudioPublicAPI",
      apiVersion: "1.0",
      messageType: "AuthenticationTokenRequest",
      data: {
        pluginName: this.pluginName,
        pluginDeveloper: this.pluginDeveloper,
        pluginIcon: "",
      },
    });
  }

  private attachHandlers(socket: WebSocketLike): void {
    socket.addEventListener("message", (event: unknown) => {
      const raw =
        typeof (event as MessageEvent).data === "string"
          ? (event as MessageEvent).data
          : String(event);
      this.handleMessage(raw);
    });

    socket.addEventListener("close", (event: unknown) => {
      const closeEvent = event as CloseEvent;
      this.authenticated = false;
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

    switch (messageType) {
      case "AuthenticationTokenResponse":
      case "AuthenticationResponse": {
        const data = message.data as { authenticated?: boolean } | undefined;
        if (data?.authenticated !== false) {
          this.authenticated = true;
          this.emit("authenticated", undefined);
        }
        break;
      }
      default:
        break;
    }
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
