import { SakuraFaceLiveDriver } from "../face-live/sakuraDriver.js";
import { RealtimeChatClient } from "../realtime-chat/realtimeClient.js";
import {
  DEFAULT_FACE_LIVE_URL,
  DEFAULT_SAMPLE_RATE_HZ,
} from "../realtime-chat/cantoneseConfig.js";
import { VoiceBridge } from "../voice-bridge/voiceBridge.js";
import type {
  AmojiEngineConfig,
  ConnectionState,
  OrchestratorEventMap,
  OrchestratorEventName,
  OrchestratorListener,
  OrchestratorPhase,
} from "../types.js";

export interface AmojiOrchestratorOptions extends AmojiEngineConfig {
  /** Skip Face Live connection (voice-only mode). */
  voiceOnly?: boolean;
  createWebSocket?: RealtimeChatClient extends never
    ? never
    : ConstructorParameters<typeof RealtimeChatClient>[0]["createWebSocket"];
}

/**
 * Top-level coordinator for Cantonese realtime voice + Sakura Face Live.
 *
 * Lifecycle: connect → listen (mic → Realtime) → speak (Realtime TTS → Face Live lip-sync)
 */
export class AmojiOrchestrator {
  private readonly config: AmojiEngineConfig & {
    faceLiveUrl: string;
    sampleRateHz: number;
  };
  private readonly voiceOnly: boolean;
  private phase: OrchestratorPhase = "idle";
  private readonly realtime: RealtimeChatClient;
  private readonly faceLive: SakuraFaceLiveDriver;
  private readonly voiceBridge: VoiceBridge;
  private readonly listeners = new Map<
    OrchestratorEventName,
    Set<OrchestratorListener<OrchestratorEventName>>
  >();

  constructor(options: AmojiOrchestratorOptions) {
    this.config = {
      openAiApiKey: options.openAiApiKey,
      realtimeModel: options.realtimeModel,
      faceLiveUrl: options.faceLiveUrl ?? DEFAULT_FACE_LIVE_URL,
      systemInstructions: options.systemInstructions,
      voice: options.voice,
      sampleRateHz: options.sampleRateHz ?? DEFAULT_SAMPLE_RATE_HZ,
    };
    this.voiceOnly = options.voiceOnly ?? false;

    this.realtime = new RealtimeChatClient({
      apiKey: options.openAiApiKey,
      model: options.realtimeModel,
      session: options.systemInstructions
        ? { instructions: options.systemInstructions }
        : undefined,
      createWebSocket: options.createWebSocket,
    });

    this.faceLive = new SakuraFaceLiveDriver({
      url: this.config.faceLiveUrl,
    });

    this.voiceBridge = new VoiceBridge({
      sampleRateHz: this.config.sampleRateHz,
      onMicFrame: (frame) => {
        if (this.phase === "listening" || this.phase === "idle") {
          this.realtime.appendInputAudio(frame);
        }
      },
      onSpeakerFrame: (frame) => {
        void this.handleSpeakerFrame(frame);
      },
    });

    this.wireInternalEvents();
  }

  get currentPhase(): OrchestratorPhase {
    return this.phase;
  }

  get realtimeClient(): RealtimeChatClient {
    return this.realtime;
  }

  get faceLiveDriver(): SakuraFaceLiveDriver {
    return this.faceLive;
  }

  get bridge(): VoiceBridge {
    return this.voiceBridge;
  }

  on<K extends OrchestratorEventName>(
    event: K,
    listener: OrchestratorListener<K>,
  ): () => void {
    const bucket =
      this.listeners.get(event) ??
      new Set<OrchestratorListener<OrchestratorEventName>>();
    bucket.add(listener as OrchestratorListener<OrchestratorEventName>);
    this.listeners.set(event, bucket);
    return () =>
      bucket.delete(listener as OrchestratorListener<OrchestratorEventName>);
  }

  async start(): Promise<void> {
    this.setPhase("idle");
    await this.realtime.connect();
    if (!this.voiceOnly) {
      try {
        await this.faceLive.connect();
      } catch (error) {
        this.emit("error", {
          source: "face-live",
          message: "Face Live unavailable; continuing voice-only",
          cause: error,
        });
      }
    }
    this.voiceBridge.start();
    this.setPhase("listening");
  }

  async stop(): Promise<void> {
    this.voiceBridge.stop();
    this.realtime.disconnect();
    this.faceLive.disconnect();
    this.setPhase("idle");
  }

  /** Push microphone PCM16 into the pipeline. */
  pushMicAudio(pcm16: Int16Array): void {
    this.voiceBridge.pushMicSamples(pcm16);
  }

  /** Push Float32 mic samples (browser AudioWorklet). */
  pushMicFloat32(float32: Float32Array): void {
    this.voiceBridge.pushMicFloat32(float32);
  }

  /** User barge-in: cancel assistant speech. */
  interrupt(): void {
    this.realtime.cancelResponse();
    this.setPhase("listening");
  }

  private wireInternalEvents(): void {
    this.realtime.on("speechStarted", () => {
      this.setPhase("listening");
    });

    this.realtime.on("speechStopped", () => {
      this.setPhase("thinking");
      this.realtime.commitInputAndRespond();
    });

    this.realtime.on("userTranscript", ({ text }) => {
      this.emit("transcript", { role: "user", text });
      if (!this.voiceOnly) {
        void this.faceLive.reactToTranscript(text);
      }
    });

    this.realtime.on("assistantTranscript", ({ text }) => {
      this.emit("transcript", { role: "assistant", text });
      if (!this.voiceOnly) {
        void this.faceLive.reactToTranscript(text);
      }
    });

    this.realtime.on("audioDelta", ({ pcm16 }) => {
      this.setPhase("speaking");
      const out = this.voiceBridge.playAssistantAudio(pcm16);
      this.emit("audioOut", { pcm16: out });
    });

    this.realtime.on("error", ({ message, cause }) => {
      this.setPhase("error");
      this.emit("error", { source: "realtime", message, cause });
    });

    this.realtime.on("disconnected", () => {
      this.emitState("realtime", "disconnected");
    });

    this.realtime.on("connected", () => {
      this.emitState("realtime", "connected");
    });

    this.faceLive.on("state", (state) => {
      this.emitState("face-live", state);
    });

    this.faceLive.on("error", ({ message, cause }) => {
      this.emit("error", { source: "face-live", message, cause });
    });
  }

  private async handleSpeakerFrame(pcm16: Int16Array): Promise<void> {
    if (this.voiceOnly || !this.faceLive.isAuthenticated) return;
    await this.faceLive.driveLipSync(pcm16);
    this.emit("faceLive", {
      expression: this.faceLive.expression,
      parameters: [],
    });
  }

  private setPhase(phase: OrchestratorPhase): void {
    this.phase = phase;
    this.emit("phase", phase);
  }

  private emitState(component: string, state: ConnectionState): void {
    this.emit("state", { component, state });
  }

  private emit<K extends OrchestratorEventName>(
    event: K,
    payload: OrchestratorEventMap[K],
  ): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    for (const listener of bucket) {
      (listener as OrchestratorListener<K>)(payload);
    }
  }
}
