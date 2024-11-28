import { ListenerConfig, ListenerStatus } from "../types/listener";
import ConfigurationService from "./configurationService";
import ListenerFactory from "../core/listenerFactory";
import BlockchainListener from "../core/BlockchainListener";
import { PubsubService } from "./pubsubService";
import { Logger } from "../core/Logger";

export default class ListenerOrchestrator {
  private listeners: Map<string, BlockchainListener>;
  private listenerStatuses: Map<string, ListenerStatus>;
  private configService: ConfigurationService;
  private listenerFactory: ListenerFactory;
  private pubsub: PubsubService
  private logger: Logger

  constructor() {
    this.listeners = new Map()
    this.listenerStatuses = new Map()
    this.configService = new ConfigurationService()
    this.listenerFactory = new ListenerFactory()
    this.pubsub = PubsubService.getInstance()
    this.logger = Logger.getInstance()
  }

  async start() {
    // Load each config and start active listeners
    const configs = await this.configService.getAllConfig()
    for (const config of configs) {
      if (config.enabled) {
        await this.startListener(config.id)
      }
    }

    // Start listener watchdog
    this.startHealthCheck();
  }

  async startListener(listenerId: string): Promise<void> {
    const config = await this.configService.getConfig(listenerId)
    try {
      if (!config) {
        throw new Error(`Configuration not found for listener ${listenerId}`)
      }

      // Create and start listener
      const listener = await this.listenerFactory.createListener(config)
      await listener.start();

      // Save listener and his status
      this.listeners.set(listenerId, listener)
      this.updateListenerStatus(listenerId, 'RUNNING')

      this.logger.info(`${config.chainId} listener started`)
    } catch (error: any) {
      this.logger.error(`Cannot start ${config?.chainId || 'unconfigured'} listener.`, error)
      this.updateListenerStatus(listenerId, 'ERROR', error.message)
      throw error;
    }
  }

  async stopListener(listenerId: string): Promise<void> {
    const listener = this.listeners.get(listenerId)
    if (listener) {
      await listener.stop()
      this.listeners.delete(listenerId)
      this.updateListenerStatus(listenerId, 'STOPPED')
    }
  }

  private updateListenerStatus(
    listenerId: string,
    status: ListenerStatus['status'],
    error?: string
  ): void {
    this.listenerStatuses.set(listenerId, {
      id: listenerId,
      status,
      lastError: error,
      lastHeartbeat: new Date()
    })
    
    this.pubsub.publish('listener:status', this.listenerStatuses.get(listenerId))
  }

  private startHealthCheck(): void {
    setInterval(() => {
      this.checkListenersHealth()
    }, 30000)
  }

  private async checkListenersHealth(): Promise<void> {
    for (const [listenerId, listener] of this.listeners.entries()) {
      try {
        const isHealthy = await listener.checkhealth();
        if (!isHealthy) {
          await this.restartListener(listenerId)
        }
      } catch (error: any) {
        this.updateListenerStatus(listenerId, 'ERROR', error.message)
      }
    }
  }

  private async restartListener(listenerId: string): Promise<void> {
    try {
      await this.stopListener(listenerId)
      await this.startListener(listenerId)
      this.logger.info(`Successfully restarted listener ${listenerId}`)
    } catch (error: any) {
      this.logger.error(`Failed to restart listener ${listenerId}`, error)
      throw error
    }
  }

  async addListener(config: ListenerConfig): Promise<void> {
    await this.configService.addConfig(config)
    if (config.enabled) {
      await this.startListener(config.id)
    }
  }

  async removeListener(listenerId: string): Promise<void> {
    await this.stopListener(listenerId)
    await this.configService.removeConfig(listenerId)
  }

  async getListenerStatus(listenerId: string): Promise<ListenerStatus | undefined> {
    return this.listenerStatuses.get(listenerId)
  }

  async getAllListenerStatuses(): Promise<ListenerStatus[]> {
    return Array.from(this.listenerStatuses.values())
  }
}


// TODO:

// Persistence
// -- Stockage des configurations en base de données
// -- Historique des statuts
// -- Journal des événements


// Scaling
// -- Distribution des listeners sur plusieurs instances
// -- Load balancing
// -- État partagé via Redis


// Monitoring avancé
// -- Métriques détaillées
// -- Alerting
// -- Dashboard de statut


// Gestion des ressources
// -- Limitation du nombre de listeners par instance
// -- Gestion de la mémoire/CPU
// -- Rate limiting
