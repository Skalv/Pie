import express, { Express, NextFunction, Request, Response } from "express";
import ListenerOrchestrator from "./services/listenerOrchestrator";
import { WebSocketServer } from "./services/websocketServer";
import { Logger } from "./core/Logger";
import { EventManager } from "./services/EventManager";
import { Chains } from "./config/chains";
import { DatabaseService } from "./services/DatabaseService";

const app: Express = express();

const eventManager = EventManager.getInstance()
const databaseService = DatabaseService.getInstance()
const listenerOrchecstrator = new ListenerOrchestrator()
const wsServer = new WebSocketServer(+process.env.PORT_SOCKET! || 8080)
const logger = Logger.getInstance()

const startApp = async ()=> {
  databaseService.start()
  eventManager.start()
  await listenerOrchecstrator.start()

  for (const listnerConf of Chains) {
    await listenerOrchecstrator.addListener(listnerConf)
  }
}
startApp()

// Middlewares
app.use(express.json());

// API REST
app.get("/", (req: Request, res: Response) => {
  res.send("Hello world");
});

// error Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

export {app, wsServer, logger}
