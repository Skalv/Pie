import BlockchainListener from "../core/BlockchainListener";
import CosmosListener from "../core/CosmosListener";
import DefaultCosmosStrategy from "../strategies/CosmosChainStrategy";
import { CosmosChainStrategy } from "../types/cosmos";
import { ListenerConfig } from "../types/listener";

export default class ListenerFactory {
  async createListener(config: ListenerConfig): Promise<BlockchainListener> {
    switch (config.chainId.split(":")[0]) {
      case 'cosmos':
        const strategy = await this.getListenerStrategy(config)
        return new CosmosListener(config, strategy)
      /*
      case 'evm':
        return new EVMListener(config)
      */
      default:
        throw new Error(`unsupported blockchain type: ${config.chainId}`)
    }
  }

  async getListenerStrategy(config: ListenerConfig): Promise<CosmosChainStrategy> {
    if (!config.strategyName) return new DefaultCosmosStrategy(config.rpcEndpoint, config.restEndpoint)
    
    const chainStrategy = await import(`../strategies/${config.strategyName}`)
    return chainStrategy.default
      ? new chainStrategy.default(config.rpcEndpoint, config.restEndpoint)
      : new chainStrategy(config.rpcEndpoint, config.restEndpoint)
  }
}
