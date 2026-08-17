/**
 * Browser/Node Sakura Face Live client — VTube Studio–compatible subset.
 * Auth handshake + InjectParameterDataRequest for idle / lip-sync / talk-gesture params.
 */
import { TALK_GESTURE_PARAM_IDS } from "./talkGestures.js";

export const FACE_LIVE_CLIENT_SCHEMA = 'amoji.faceLiveClient.v1';

export const SAKURA_PARAM_IDS = Object.freeze({
  mouthOpen: 'ParamMouthOpenY',
  mouthSmile: 'ParamMouthSmile',
  eyeOpenLeft: 'ParamEyeLOpen',
  eyeOpenRight: 'ParamEyeROpen',
  browLeftY: 'ParamBrowLY',
  browRightY: 'ParamBrowRY',
  cheek: 'ParamCheek',
  angleX: 'ParamAngleX',
  angleY: 'ParamAngleY',
  // Disney-style talk body / hands / fingers (map in VTS / Live2D)
  ...TALK_GESTURE_PARAM_IDS,
});

export const SAKURA_EXPRESSION_PRESETS = Object.freeze({
  neutral: [
    { id: SAKURA_PARAM_IDS.mouthOpen, value: 0 },
    { id: SAKURA_PARAM_IDS.mouthSmile, value: 0.15 },
    { id: SAKURA_PARAM_IDS.browLeftY, value: 0 },
    { id: SAKURA_PARAM_IDS.browRightY, value: 0 },
    { id: SAKURA_PARAM_IDS.cheek, value: 0 },
  ],
  happy: [
    { id: SAKURA_PARAM_IDS.mouthOpen, value: 0.35 },
    { id: SAKURA_PARAM_IDS.mouthSmile, value: 0.85 },
    { id: SAKURA_PARAM_IDS.cheek, value: 0.6 },
    { id: SAKURA_PARAM_IDS.browLeftY, value: 0.1 },
    { id: SAKURA_PARAM_IDS.browRightY, value: 0.1 },
  ],
  thinking: [
    { id: SAKURA_PARAM_IDS.mouthOpen, value: 0.05 },
    { id: SAKURA_PARAM_IDS.mouthSmile, value: 0 },
    { id: SAKURA_PARAM_IDS.angleY, value: -0.15 },
    { id: SAKURA_PARAM_IDS.browLeftY, value: 0.35 },
    { id: SAKURA_PARAM_IDS.browRightY, value: 0.1 },
  ],
  sad: [
    { id: SAKURA_PARAM_IDS.mouthOpen, value: 0.1 },
    { id: SAKURA_PARAM_IDS.mouthSmile, value: -0.4 },
    { id: SAKURA_PARAM_IDS.browLeftY, value: -0.5 },
    { id: SAKURA_PARAM_IDS.browRightY, value: -0.5 },
    { id: SAKURA_PARAM_IDS.angleY, value: 0.1 },
  ],
  surprised: [
    { id: SAKURA_PARAM_IDS.mouthOpen, value: 0.7 },
    { id: SAKURA_PARAM_IDS.mouthSmile, value: 0 },
    { id: SAKURA_PARAM_IDS.browLeftY, value: 0.8 },
    { id: SAKURA_PARAM_IDS.browRightY, value: 0.8 },
    { id: SAKURA_PARAM_IDS.eyeOpenLeft, value: 1 },
    { id: SAKURA_PARAM_IDS.eyeOpenRight, value: 1 },
  ],
  angry: [
    { id: SAKURA_PARAM_IDS.mouthOpen, value: 0.2 },
    { id: SAKURA_PARAM_IDS.mouthSmile, value: -0.35 },
    { id: SAKURA_PARAM_IDS.browLeftY, value: -0.65 },
    { id: SAKURA_PARAM_IDS.browRightY, value: -0.65 },
    { id: SAKURA_PARAM_IDS.cheek, value: 0.25 },
  ],
});

/** Ordered cycle for lab Expression demo. */
export const SAKURA_EXPRESSION_CYCLE = Object.freeze([
  'neutral',
  'happy',
  'thinking',
  'surprised',
  'sad',
  'angry',
]);

const VTS_API = 'VTubeStudioPublicAPI';
const VTS_VERSION = '1.0';
const WS_OPEN = 1;

/**
 * @param {{
 *   url?: string,
 *   pluginName?: string,
 *   pluginDeveloper?: string,
 *   authenticationToken?: string | null,
 *   authTimeoutMs?: number,
 *   createWebSocket?: (url: string) => WebSocket,
 *   onEvent?: (event: string, payload?: object) => void,
 * }} [opts]
 */
export function createSakuraFaceLiveClient(opts = {}) {
  const url = opts.url || 'ws://127.0.0.1:8765';
  const pluginName = opts.pluginName || 'Amoji Engine';
  const pluginDeveloper = opts.pluginDeveloper || 'MonMonMars';
  const authTimeoutMs = opts.authTimeoutMs ?? 8000;
  let authToken = opts.authenticationToken ?? null;
  /** @type {WebSocket | null} */
  let socket = null;
  let authenticated = false;
  let requestId = 0;
  /** @type {((v?: unknown) => void) | null} */
  let authResolve = null;
  /** @type {((e: Error) => void) | null} */
  let authReject = null;
  /** @type {Array<{ id: string, value: number }>} */
  let lastInjected = [];
  let expression = 'neutral';

  const emit = (event, payload) => opts.onEvent?.(event, payload);

  const nextRequestId = () => {
    requestId += 1;
    return `amoji-${requestId}`;
  };

  const send = (payload) => {
    if (!socket || socket.readyState !== WS_OPEN) return;
    socket.send(JSON.stringify(payload));
  };

  const sendAuthRequest = (token) => {
    send({
      apiName: VTS_API,
      apiVersion: VTS_VERSION,
      requestID: nextRequestId(),
      messageType: 'AuthenticationRequest',
      data: {
        pluginName,
        pluginDeveloper,
        authenticationToken: token,
      },
    });
  };

  const handleMessage = (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      emit('error', { message: 'Invalid JSON from Face Live' });
      return;
    }
    const messageType = String(message.messageType || '');
    const data = message.data || {};

    switch (messageType) {
      case 'AuthenticationTokenResponse': {
        const token = String(data.authenticationToken || '');
        if (!token) {
          authReject?.(new Error('Empty auth token'));
          authResolve = null;
          authReject = null;
          break;
        }
        authToken = token;
        sendAuthRequest(token);
        break;
      }
      case 'AuthenticationResponse': {
        if (data.authenticated === true) {
          authenticated = true;
          emit('authenticated', { token: authToken });
          authResolve?.();
          authResolve = null;
          authReject = null;
        } else {
          authenticated = false;
          authToken = null;
          const err = new Error(String(data.reason || 'Face Live auth rejected'));
          authReject?.(err);
          authResolve = null;
          authReject = null;
          emit('error', { message: err.message });
        }
        break;
      }
      case 'APIError': {
        emit('error', { message: String(data.message || 'Face Live API error') });
        break;
      }
      default:
        break;
    }
  };

  return {
    get schema() {
      return FACE_LIVE_CLIENT_SCHEMA;
    },
    get url() {
      return url;
    },
    get connected() {
      return Boolean(socket && socket.readyState === WS_OPEN);
    },
    get isAuthenticated() {
      return authenticated;
    },
    get authenticationToken() {
      return authToken;
    },
    get expression() {
      return expression;
    },
    get lastInjected() {
      return lastInjected.slice();
    },

    async connect() {
      if (this.connected && authenticated) return;
      authenticated = false;

      const createWs =
        opts.createWebSocket ||
        (async (u) => {
          if (typeof globalThis.WebSocket !== 'undefined') {
            return new globalThis.WebSocket(u);
          }
          const { default: WS } = await import('ws');
          return new WS(u);
        });

      socket = await createWs(url);
      await waitForOpen(socket);
      emit('connected', { url });

      const onMessage = (ev) => {
        const raw = ev && typeof ev === 'object' && 'data' in ev ? ev.data : ev;
        handleMessage(raw);
      };
      if (typeof socket.addEventListener === 'function') {
        socket.addEventListener('message', onMessage);
        socket.addEventListener('close', () => {
          authenticated = false;
          emit('disconnected', {});
        });
      } else if (typeof socket.on === 'function') {
        socket.on('message', onMessage);
        socket.on('close', () => {
          authenticated = false;
          emit('disconnected', {});
        });
      }

      await new Promise((resolve, reject) => {
        authResolve = resolve;
        authReject = reject;
        const timeout = setTimeout(() => {
          reject(new Error('Face Live authentication timed out'));
          authResolve = null;
          authReject = null;
        }, authTimeoutMs);

        const clear = () => clearTimeout(timeout);
        const origResolve = authResolve;
        const origReject = authReject;
        authResolve = () => {
          clear();
          origResolve?.();
        };
        authReject = (err) => {
          clear();
          origReject?.(err);
        };

        if (authToken) sendAuthRequest(authToken);
        else {
          send({
            apiName: VTS_API,
            apiVersion: VTS_VERSION,
            requestID: nextRequestId(),
            messageType: 'AuthenticationTokenRequest',
            data: {
              pluginName,
              pluginDeveloper,
              pluginIcon: '',
            },
          });
        }
      });
    },

    disconnect() {
      try {
        socket?.close?.(1000, 'client disconnect');
      } catch {
        /* ignore */
      }
      socket = null;
      authenticated = false;
      emit('disconnected', {});
    },

    /**
     * @param {Array<{ id: string, value: number }>} parameters
     */
    injectParameters(parameters = []) {
      if (!this.connected || !authenticated) return false;
      lastInjected = parameters.map((p) => ({
        id: p.id,
        value: Number(p.value) || 0,
      }));
      send({
        apiName: VTS_API,
        apiVersion: VTS_VERSION,
        requestID: nextRequestId(),
        messageType: 'InjectParameterDataRequest',
        data: {
          faceFound: true,
          mode: 'set',
          parameterValues: lastInjected,
        },
      });
      emit('parametersInjected', { parameters: lastInjected });
      return true;
    },

    /**
     * @param {keyof typeof SAKURA_EXPRESSION_PRESETS | string} name
     */
    setExpression(name = 'neutral') {
      const key = String(name || 'neutral').toLowerCase();
      expression = SAKURA_EXPRESSION_PRESETS[key] ? key : 'neutral';
      const preset =
        SAKURA_EXPRESSION_PRESETS[expression] || SAKURA_EXPRESSION_PRESETS.neutral;
      return this.injectParameters(preset);
    },

    resetLipSync() {
      return this.injectParameters([
        { id: SAKURA_PARAM_IDS.mouthOpen, value: 0 },
        { id: SAKURA_PARAM_IDS.mouthSmile, value: 0.15 },
      ]);
    },
  };
}

function waitForOpen(socket) {
  if (socket.readyState === WS_OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onOpen = () => resolve();
    const onError = () => reject(new Error('Face Live WebSocket failed'));
    if (typeof socket.addEventListener === 'function') {
      socket.addEventListener('open', onOpen);
      socket.addEventListener('error', onError);
    } else if (typeof socket.on === 'function') {
      socket.once('open', onOpen);
      socket.once('error', onError);
    } else {
      reject(new Error('Unsupported WebSocket'));
    }
  });
}
