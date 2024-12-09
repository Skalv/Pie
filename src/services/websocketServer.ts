import WebSocket from "ws";
import { BlockchainEvent } from "../types/listener";
import { Subscription } from "../types/webSocket";
import { Logger } from "../core/Logger";
import { PubsubService } from "./pubsubService";
import { CustomLogger } from "../types/log";
import { MetricsService } from "./MetricsService";

export class WebSocketServer {
  private readonly logger: CustomLogger
  private wss: WebSocket.Server;
  private connections: Map<string, WebSocket> = new Map();
  private pubsub: PubsubService;
  private metrics: MetricsService

  constructor(port: number) {
    this.metrics = MetricsService.getInstance()
    this.logger = Logger.getInstance().getComponentLogger('websocket')
    this.pubsub = PubsubService.getInstance();

    this.wss = new WebSocket.Server({ port, verifyClient: (info, callback) => {
      try {
        const urlParams = new URL('http://localhost' + info.req.url).searchParams;
        (info.req as any).clientId = urlParams.get('clientId')
        return callback(true)
      } catch(err) {
        this.logger.error(`Connection without clientId`, err)
        return callback(false)
      }
    } });
    
    this.setupWebSocketServer();
    this.setupEventListener();
  }

  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket, request: any) => {
      const uid = request.clientId
      this.connections.set(uid, ws);
      this.logger.debug(`New WS connection: ${uid}`, {uid})

      this.metrics.updateActiveWSConnections(this.connections.size)
      this.metrics.incWSConnections()

      ws.on("message", (message: string) => {
        try {
          const { action, events } = JSON.parse(message);
          if (action === "subscribe") {
            this.handleSubscription(uid, events);
          }
        } catch (error) {
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        this.handleClose(uid);
      });
    });

    this.logger.info("WebSocketServer waiting connections on port 8080");
  }

  private setupEventListener() {
    this.pubsub.subscribe(
      "event:match",
      ({ uid, event }: { uid: string; event: BlockchainEvent }) => {
        this.broadcastEvent(uid, event);
      },
    );
  }

  private handleSubscription(uid: string, events: Subscription[]) {
    this.logger.debug("New WS subscription", events);
    events.forEach((event) => {
      this.pubsub.publish("subscription:add", { uid, event });
    });
  }

  private handleClose(uid: string) {
    this.pubsub.publish("subscription:remove", uid);
    this.connections.delete(uid);

    this.metrics.updateActiveWSConnections(this.connections.size)
  }

  private broadcastEvent(uid: string, event: BlockchainEvent) {
    const ws = this.connections.get(uid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log("send", event)
      ws.send(JSON.stringify(event));
    }
  }
}
