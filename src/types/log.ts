import {Logger as PinoLogger, Level} from "pino";

export interface LogMetadata {
  chainId?: string;
  blockHeight?: number;
  txHash?: string;
  eventType?: string;
  component?: string;
  [key: string]: any;
}

declare module 'pino' {
  export interface LevelMapping {
    blockchain: number;
  }
}

export interface CustomLogger extends PinoLogger {
  blockchain: PinoLogger[Level]
}
