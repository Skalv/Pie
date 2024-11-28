export interface CosmosChainStrategy {
  fetchBalance(address: string): Promise<{ denom: string; amount: string }[]>;
  fetchDelegation(address: string): Promise<any[]>;
  fetchRewards(address: string): Promise<any[]>;
  parseTransaction(tx: any): any;
}

export interface CosmosEvent {
  type: string;
  attributes: {
    key: string;
    value: string;
  }
}

export interface CosmosTxEvent {
  tx: string; // hash
  height: string;
  events: CosmosEvent[];
  code?: number; // 0 = success
}

export interface CosmosBlockEvent {
  block: {
    height: string;
    hash: string;
    timestamp: string;
    proposer: string;
  };
  events: CosmosEvent[];
}
