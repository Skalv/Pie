import WebSocket from "ws";
import BlockchainListener from "../core/BlockchainListener";
import DefaultCosmosStrategy from "../strategies/CosmosChainStrategy";
import { CosmosChainStrategy } from "../types/cosmos";
import { BlockchainEvent, ListenerConfig } from "../types/listener";
import { decodeTxRaw } from "@cosmjs/proto-signing";
import { Logger } from "./Logger";
import { CustomLogger } from "../types/log";
import { PubsubService } from "../services/pubsubService";

export default class CosmosListener extends BlockchainListener {
  private readonly strategy: CosmosChainStrategy;
  private websocket: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectionAttemps: number = 5;
  private logger: CustomLogger
  private pubsub: PubsubService

  constructor(config: ListenerConfig, strategy?: CosmosChainStrategy) {
    super(config);

    this.strategy =
      strategy ||
      new DefaultCosmosStrategy(config.rpcEndpoint, config.restEndpoint);

    this.logger = Logger.getInstance().getChainLogger(config.chainId)
    this.pubsub = PubsubService.getInstance()
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      await this.connectWebsocket();
      this.isRunning = true;
      this.reconnectAttempts = 0;
    } catch (error: any) {
      this.logger.error(error)
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  async checkhealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.rpcEndpoint}/health`);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getBalance(
    address: string,
  ): Promise<{ denom: string; amount: string }[]> {
    return this.strategy.fetchBalance(address);
  }
  async getDelegation(address: string): Promise<any[]> {
    return this.strategy.fetchDelegation(address);
  }
  async getRewards(address: string): Promise<any[]> {
    return this.strategy.fetchRewards(address);
  }

  private async connectWebsocket(): Promise<void> {
    const wsUrl = this.config.rpcEndpoint.replace("http", "ws") + "/websocket";
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      this.subscribeToEvents();
    };
    this.websocket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleNewMessage(message);
      } catch (error: any) {
        this.logger.error("Can't parse message", error)
      }
    });
    this.websocket.on("error", (error) => {
      this.pubsub.publish(`ERROR:${this.config.chainId}`, error)
    });
    /*
    this.websocket.on("close", () => {
      console.log("CosmosListener:onClose");
      //       this.handleWebsocketClose()
    });
    */
  }

  private subscribeToEvents(): void {
    if (!this.websocket) return;

    this.config.eventTypes.forEach((eventType) => {
      const subscription = {
        jsonrpc: "2.0",
        method: "subscribe",
        id: `${this.config.chainId}-${eventType}`,
        params: {
          query: `tm.event='${eventType}'`,
        },
      };

      this.websocket!.send(JSON.stringify(subscription));
    });
  }

  private handleNewMessage(message: any) {
    if (message.result?.data?.value?.block) {
      const block = message.result.data.value.block;
      const blockHeight = block.header.height;
      const timestamp = new Date(block.header.time).getTime();
      this.logger.debug(`New block for ${this.config.chainId}. Nb TX: ${block.data.txs.length}`)

      if (block.data.txs) {
        block.data.txs.forEach((tx: any) => {
          const decodedTx = decodeTxRaw(Buffer.from(tx, "base64"));

          for (const msg of decodedTx.body.messages) {
            const eventData = this.strategy.parseTransaction(msg)

            if (eventData) {
              const blockchainEvent: BlockchainEvent = {
                chainId: this.config.chainId,
                eventType: eventData.type,
                blockHeight,
                timestamp,
                data: eventData.data,
              };

              this.pubsub.publish('blockchainevent', blockchainEvent)
            } else {
              this.logger.error(new Error(`Unknow TX type: ${msg.typeUrl}`))
            }
          }
        });
      }
    }
  }
}
