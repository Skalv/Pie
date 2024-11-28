import { ListenerConfig } from "../types/listener";

export default abstract class BlockchainListener {
  protected config: ListenerConfig;
  protected isRunning: boolean = false;

  constructor(config: ListenerConfig) {
    this.config = config;
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract checkhealth(): Promise<boolean>;
}
