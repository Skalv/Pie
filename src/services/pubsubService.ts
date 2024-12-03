import { createClient } from "redis";
import { Logger } from "../core/Logger";

export class PubsubService {
  private publisher;
  private subscriber;
  private readonly logger: Logger;
  private static instance: PubsubService;

  private constructor() {
    this.logger = Logger.getInstance();
    this.publisher = createClient({
      url: process.env.REDIS_URL || 'redis://:pwd123@127.0.0.1:6379'
    });
    this.subscriber = createClient({
      url: process.env.REDIS_URL || 'redis://:pwd123@127.0.0.1:6379'
    });

    this.initialize();
  }

  static getInstance(): PubsubService {
    if (!PubsubService.instance) {
      PubsubService.instance = new PubsubService();
    }

    return PubsubService.instance;
  }

  private async initialize() {
    try {
      await this.publisher.connect();
      await this.subscriber.connect();
      this.logger.info("Redis connections etablished");
    } catch (error: any) {
      this.logger.error("Redis connection error:", error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.publisher.disconnect()
      await this.subscriber.disconnect()
      this.logger.info("Redis connections closed")
    } catch (error: any) {
      this.logger.error("Redis disconnection error:", error)
    }
  }

  async publish(channel: string, message: any) {
    try {
      await this.publisher.publish(channel, this.serializeMessage(message));
    } catch (error: any) {
      this.logger.error("Redis publish error:", error);
    }
  }

  async subscribe(channel: string, callback: (message: any) => void) {
    try {
      await this.subscriber.subscribe(channel, (message: string) => {
        callback(JSON.parse(message))
      });
    } catch (error: any) {
      this.logger.error("Redis subscribe error:", error);
    }
  }
  
  private serializeMessage(obj: any): string {
    return JSON.stringify(obj, (_, value) => 
      typeof value === 'bigint' ? value.toString() : value
    )
  }
}
