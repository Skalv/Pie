import express, { Express, NextFunction, Request, Response } from "express";
import ListenerOrchestrator from "./services/listenerOrchestrator";
import { WebSocketServer } from "./services/websocketServer";
import { Logger } from "./core/Logger";
import { EventManager } from "./services/EventManager";
import { Chains } from "./config/chains";
import { DatabaseService } from "./services/DatabaseService";
import { MetricsService } from "./services/MetricsService";
import BlockchainListener from "./core/BlockchainListener";

const app: Express = express();

const metricsService = MetricsService.getInstance();
const eventManager = EventManager.getInstance();
const databaseService = DatabaseService.getInstance();
const listenerOrchecstrator = new ListenerOrchestrator();
const wsServer = new WebSocketServer(+process.env.PORT_SOCKET! || 8080);
const logger = Logger.getInstance();

const startApp = async () => {
  databaseService.start();
  eventManager.start();
  await listenerOrchecstrator.start();

  for (const listnerConf of Chains) {
    await listenerOrchecstrator.addListener(listnerConf);
  }
};
startApp();

// Middlewares
app.use(express.json());

// API REST
app.get("/", (req: Request, res: Response) => {
  res.send("Hello world");
});
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", "text/plain");
  const metrics = await metricsService.metrics();
  res.send(metrics);
});
app.get("/call/:chainId/:method", async (req: Request, res: Response): Promise<any> => {
  const { chainId, method } = req.params;
  const params = req.query
  try {
    const result = await listenerOrchecstrator.callListener(chainId, method as keyof BlockchainListener, params);
    return res.json(result)
  } catch (err: any) {

    return res.status(500).send(err.message)
  }
});

// error Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

export { app, wsServer, logger };
