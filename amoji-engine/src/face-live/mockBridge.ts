import { WebSocketServer, type WebSocket } from "ws";

export interface MockFaceLiveBridgeOptions {
  port?: number;
  /** Auto-approve plugin auth (default true). */
  autoApprove?: boolean;
  host?: string;
}

export interface MockFaceLiveBridge {
  port: number;
  url: string;
  close: () => Promise<void>;
  injected: Array<{ id: string; value: number }>;
  authTokensIssued: string[];
}

/**
 * Minimal VTube Studio–compatible WebSocket bridge for local Face Live tests.
 * Speaks AuthenticationToken / Authentication / InjectParameterData.
 */
export async function startMockFaceLiveBridge(
  options: MockFaceLiveBridgeOptions = {},
): Promise<MockFaceLiveBridge> {
  const port = options.port ?? 0;
  const host = options.host ?? "127.0.0.1";
  const autoApprove = options.autoApprove ?? true;
  const injected: Array<{ id: string; value: number }> = [];
  const authTokensIssued: string[] = [];
  const clients = new Set<WebSocket>();

  const wss = new WebSocketServer({ host, port });
  await new Promise<void>((resolve) => wss.once("listening", resolve));

  const address = wss.address();
  const boundPort =
    typeof address === "object" && address ? address.port : port;

  wss.on("connection", (socket: WebSocket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
    socket.on("message", (raw) => {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }

      const messageType = String(message.messageType ?? "");
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
          const data = message.data as
            | { parameterValues?: Array<{ id: string; value: number }> }
            | undefined;
          for (const p of data?.parameterValues ?? []) {
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
    port: boundPort,
    url: `ws://${host}:${boundPort}`,
    injected,
    authTokensIssued,
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const client of clients) {
          client.close();
        }
        wss.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

function reply(socket: WebSocket, payload: Record<string, unknown>): void {
  socket.send(
    JSON.stringify({
      apiName: "VTubeStudioPublicAPI",
      apiVersion: "1.0",
      ...payload,
    }),
  );
}
