import knex, { Knex } from "knex";
import { Logger } from "../core/Logger";
import { PubsubService } from "./pubsubService";
import { QueueService } from "./queueService";

export class DatabaseService {
  private static instance: DatabaseService
  private knex: Knex;
  private logger: Logger;
  private pubsub: PubsubService;
  private queue: QueueService;

  private constructor() {
    this.logger = Logger.getInstance()
    this.pubsub = PubsubService.getInstance()
    this.queue = QueueService.getInstance()

    this.knex = knex({
      client: "pg",
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'florent123',
        database: process.env.DB_NAME || 'pie'
      }
    })
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }

    return DatabaseService.instance
  }

  public start(): void {
    this.pubsub.subscribe('persist:blockchainEvent', async (event: any) => {
      // 
    })

    this.logger.info("DatabaseService ready.")
  }
}
