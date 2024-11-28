import { ListenerConfig } from "../types/listener";

export default class ConfigurationService {
  private configs: Map<string, ListenerConfig>;

  constructor() {
    this.configs = new Map()
  }

  async addConfig(config: ListenerConfig): Promise<void> {
    this.configs.set(config.id, config)
  }

  async removeConfig(id: string): Promise<void> {
    this.configs.delete(id)
  }

  async getConfig(id: string): Promise<ListenerConfig | undefined> {
    return this.configs.get(id)
  }

  async getAllConfig(): Promise<ListenerConfig[]> {
    return Array.from(this.configs.values())
  }
}
