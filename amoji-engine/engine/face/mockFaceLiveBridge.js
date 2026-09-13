/**
 * Minimal VTube Studio–compatible Face Live mock bridge (Node `ws`).
 * For lab smoke tests without a real Sakura / VTS instance.
 *
 * Uses a dynamic `import("ws")` so the browser lab can load `engine/index.js`
 * without resolving the bare Node specifier (which broke all demos).
 */

/**
 * @param {{
 *   port?: number,
 *   host?: string,
 *   autoApprove?: boolean,
 * }} [opts]
 */
export async function startMockFaceLiveBridge(opts = {}) {
  const host = opts.host || "127.0.0.1";
  const autoApprove = opts.autoApprove !== false;
  /** @type {Array<{ id: string, value: number }>} */
  const injected = [];
  /** @type {string[]} */
  const authTokensIssued = [];
  const clients = new Set();

  let WebSocketServer;
  try {
    ({ WebSocketServer } = await import("ws"));
  } catch (err) {
    throw new Error(
      `startMockFaceLiveBridge requires Node package "ws" (${err?.message || err})`,
    );
  }

  const wss = new WebSocketServer({ host, port: opts.port ?? 0 });
  await new Promise((resolve) => wss.once("listening", resolve));
  const address = wss.address();
  const port =
    typeof address === "object" && address ? address.port : opts.port || 0;

  const reply = (socket, payload) => {
    if (socket.readyState === 1) socket.send(JSON.stringify(payload));
  };

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
    socket.on("message", (raw) => {
      let message;
      try {
        message = JSON.parse(String(raw));
      } catch {
        return;
      }
      const messageType = String(message.messageType || "");
      const requestID = message.requestID ?? "mock";

      switch (messageType) {
        case "AuthenticationTokenRequest": {
          const token = `mock-token-${authTokensIssued.length + 1}`;
          authTokensIssued.push(token);
          reply(socket, {
            messageType: "AuthenticationTokenResponse",
            requestID,
            data: { authenticationToken: token },
          });
          break;
        }
        case "AuthenticationRequest": {
          reply(socket, {
            messageType: "AuthenticationResponse",
            requestID,
            data: {
              authenticated: autoApprove,
              reason: autoApprove ? "OK" : "Rejected by mock",
            },
          });
          break;
        }
        case "InjectParameterDataRequest": {
          const data = message.data || {};
          for (const p of data.parameterValues || []) {
            injected.push({ id: p.id, value: p.value });
          }
          reply(socket, {
            messageType: "InjectParameterDataResponse",
            requestID,
            data: {},
          });
          break;
        }
        default:
          break;
      }
    });
  });

  return {
    port,
    url: `ws://${host}:${port}`,
    injected,
    authTokensIssued,
    async close() {
      for (const c of clients) {
        try {
          c.close();
        } catch {
          /* ignore */
        }
      }
      await new Promise((resolve) => wss.close(resolve));
    },
  };
}
