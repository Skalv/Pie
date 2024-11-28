export interface ListenerConfig {
  id: string;
  chainId: string;
  rpcEndpoint: string;
  restEndpoint: string;
  eventTypes: string[];
  filters?: {
    addresses?: string[];
    eventNames?: string[];
  };
  enabled: boolean;
  strategyName?: string;
}

export interface ListenerStatus {
  id: string;
  status: 'RUNNING' | 'STOPPED' | 'ERROR'
  lastError?: string
  lastHeartbeat: Date;
}

export interface BlockchainEvent {
  chainId: string;
  eventType: string;
  blockHeight: string;
  timestamp: number;
  data: {
    affectedAddresses: string[],
    [key: string]: any
  };
}
