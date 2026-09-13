import {
  buildCantoneseRealtimeSession,
  DEFAULT_REALTIME_MODEL,
  DEFAULT_SAMPLE_RATE_HZ,
  realtimeAuthHeaders,
  realtimeWebSocketUrl,
  toRealtimeSessionWire,
} from "./cantoneseConfig.js";
import type {
  RealtimeClientEvents,
  RealtimeEventName,
  RealtimeListener,
  RealtimeSessionConfig,
} from "../types.js";

type WebSocketLike = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: unknown) => void,
  ): void;
  removeEventListener(
    type: "open" | "message" | "close" | "error",
    listener: (event: unknown) => void,
  ): void;
};

const WS_OPEN = 1;

export interface RealtimeChatOptions {
  apiKey: string;
  model?: string;
  session?: Partial<RealtimeSessionConfig>;
  sampleRateHz?: number;
  /** Inject a WebSocket implementation (Node `ws` or browser WebSocket). */
  createWebSocket?: (
    url: string,
    headers: Record<string, string>,
  ) => WebSocketLike;
}

/** OpenAI Realtime API client for Cantonese duplex voice chat (GA wire format). */
export class RealtimeChatClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly sampleRateHz: number;
  private readonly sessionConfig: RealtimeSessionConfig;
  private readonly createWebSocket: RealtimeChatOptions["createWebSocket"];
  private socket: WebSocketLike | null = null;
  private sessionId: string | null = null;
  private readonly listeners = new Map<
    RealtimeEventName,
    Set<RealtimeListener<RealtimeEventName>>
  >();

  constructor(options: RealtimeChatOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_REALTIME_MODEL;
    this.sampleRateHz = options.sampleRateHz ?? DEFAULT_SAMPLE_RATE_HZ;
    this.sessionConfig = buildCantoneseRealtimeSession({
      model: this.model,
      ...options.session,
    });
    this.createWebSocket = options.createWebSocket;
  }

  on<K extends RealtimeEventName>(
    event: K,
    listener: RealtimeListener<K>,
  ): () => void {
    const bucket =
      this.listeners.get(event) ??
      new Set<RealtimeListener<RealtimeEventName>>();
    bucket.add(listener as RealtimeListener<RealtimeEventName>);
    this.listeners.set(event, bucket);
    return () => bucket.delete(listener as RealtimeListener<RealtimeEventName>);
  }

  get connected(): boolean {
    return this.socket?.readyState === WS_OPEN;
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }

  get autoCreateResponse(): boolean {
    return this.sessionConfig.turnDetection.createResponse !== false;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    const url = realtimeWebSocketUrl(this.model);
    const headers = realtimeAuthHeaders(this.apiKey);
    const socket = this.createWebSocket
      ? this.createWebSocket(url, headers)
      : await createDefaultWebSocket(url, headers);

    this.socket = socket;
    await waitForOpen(socket);
    this.emit("connected", undefined);
    this.attachSocketHandlers(socket);
    this.sendSessionUpdate();
  }

  disconnect(): void {
    this.socket?.close(1000, "client disconnect");
    this.socket = null;
    this.sessionId = null;
  }

  /** Append PCM16 microphone audio to the Realtime input buffer. */
  appendInputAudio(pcm16: Int16Array): void {
    if (!this.connected) return;
    const base64 = int16ToBase64(pcm16);
    this.send({
      type: "input_audio_buffer.append",
      audio: base64,
    });
  }

  /**
   * Commit buffered input audio and optionally request a model response.
   * Skip when server VAD has `create_response: true` (auto).
   */
  commitInputAndRespond(forceCreate = false): void {
    if (!this.connected) return;
    this.send({ type: "input_audio_buffer.commit" });
    if (forceCreate || !this.autoCreateResponse) {
      this.send({ type: "response.create" });
    }
  }

  /** Cancel an in-flight assistant response (barge-in). */
  cancelResponse(): void {
    if (!this.connected) return;
    this.send({ type: "response.cancel" });
  }

  private attachSocketHandlers(socket: WebSocketLike): void {
    const onMessage = (event: unknown) => {
      this.handleServerMessage(extractSocketData(event));
    };

    const onClose = (event: unknown) => {
      const closeEvent = event as CloseEvent;
      this.emit("disconnected", {
        code: closeEvent.code ?? 1006,
        reason: closeEvent.reason ?? "",
      });
      this.socket = null;
      this.sessionId = null;
    };

    const onError = () => {
      this.emit("error", { message: "Realtime WebSocket error" });
    };

    socket.addEventListener("message", onMessage);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onError);
  }

  private handleServerMessage(raw: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.emit("error", { message: "Invalid JSON from Realtime API" });
      return;
    }

    const type = String(message.type ?? "");

    switch (type) {
      case "session.created":
      case "session.updated": {
        const session = message.session as { id?: string } | undefined;
        if (session?.id) {
          this.sessionId = session.id;
          this.emit("sessionCreated", { sessionId: session.id });
        }
        break;
      }
      case "input_audio_buffer.speech_started":
        this.emit("speechStarted", undefined);
        break;
      case "input_audio_buffer.speech_stopped":
        this.emit("speechStopped", undefined);
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const transcript = String(message.transcript ?? "");
        if (transcript) this.emit("userTranscript", { text: transcript });
        break;
      }
      case "response.output_audio_transcript.delta":
      case "response.audio_transcript.delta": {
        const transcript = String(message.delta ?? "");
        if (transcript) {
          this.emit("assistantTranscript", { text: transcript, final: false });
        }
        break;
      }
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done": {
        const transcript = String(message.transcript ?? message.delta ?? "");
        if (transcript) {
          this.emit("assistantTranscript", { text: transcript, final: true });
        }
        break;
      }
      case "response.output_audio.delta":
      case "response.audio.delta": {
        const delta = String(message.delta ?? "");
        if (delta) {
          this.emit("audioDelta", { pcm16: base64ToInt16(delta) });
        }
        break;
      }
      case "response.done":
      case "response.output_audio.done":
      case "response.audio.done":
        this.emit("responseDone", undefined);
        break;
      case "error": {
        const err = message.error as { message?: string } | undefined;
        this.emit("error", {
          message: err?.message ?? "Realtime API error",
        });
        break;
      }
      default:
        break;
    }
  }

  private sendSessionUpdate(): void {
    this.send({
      type: "session.update",
      session: toRealtimeSessionWire(this.sessionConfig, this.sampleRateHz),
    });
  }

  private send(payload: Record<string, unknown>): void {
    this.socket?.send(JSON.stringify(payload));
  }

  private emit<K extends RealtimeEventName>(
    event: K,
    payload: RealtimeClientEvents[K],
  ): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    for (const listener of bucket) {
      (listener as RealtimeListener<K>)(payload);
    }
  }
}

async function createDefaultWebSocket(
  url: string,
  headers: Record<string, string>,
): Promise<WebSocketLike> {
  if (typeof globalThis.WebSocket !== "undefined") {
    // Browser WebSocket cannot set custom headers; callers should proxy or inject.
    return new globalThis.WebSocket(url) as unknown as WebSocketLike;
  }

  const { default: WS } = await import("ws");
  return new WS(url, { headers }) as unknown as WebSocketLike;
}

function waitForOpen(socket: WebSocketLike): Promise<void> {
  if (socket.readyState === WS_OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("WebSocket failed to open"));
    };
    const cleanup = () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("error", onError);
    };
    socket.addEventListener("open", onOpen);
    socket.addEventListener("error", onError);
  });
}

export function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(
    samples.buffer,
    samples.byteOffset,
    samples.byteLength,
  );
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToInt16(base64: string): Int16Array {
  let bytes: Uint8Array;
  if (typeof Buffer !== "undefined") {
    bytes = new Uint8Array(Buffer.from(base64, "base64"));
  } else {
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  }
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
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
