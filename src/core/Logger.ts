import pino, { Level, LoggerOptions } from "pino";
import { CustomLogger, LogMetadata } from "../types/log";
import pretty from "pino-pretty";
import path from "path";
import fs from "fs";
import { COLORS, SERVICE_NAME } from "../config/logger";

export class Logger {
  private static instance: Logger;
  private logger: CustomLogger;
  private chainLoggers: Map<string, CustomLogger> = new Map();

  private constructor() {
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    const streams = [
      process.env.NODE_ENV !== 'production' && {
        level: "debug" as Level,
        stream: pretty({
          colorize: true,
          translateTime: "dd-mm-yyyy HH:MM:ss",
          ignore: "pid,hostname",
          messageFormat: (log, messageKey) => {
            const component = log.component || 'default'
            const color = COLORS[component as keyof typeof COLORS] || COLORS.default
            const serviceName = SERVICE_NAME[component as keyof typeof SERVICE_NAME] || (component as string).toUpperCase()

            return `[${serviceName}] ${log[messageKey]}`
          },
          customColors: Object.entries(COLORS).reduce((acc, [service, color]) => {
            acc[`component:${service}`] = color
            return acc
          }, {} as Record<string, string>)
        }),
      },
      {
        level: "info" as Level,
        stream: fs.createWriteStream(path.join(logsDir, "app.log"), {
          flags: "a",
        }),
      },
      {
        level: "error" as Level,
        stream: fs.createWriteStream(path.join(logsDir, "error.log"), {
          flags: "a",
        }),
      },
    ].filter(s => !!s);

    const options: LoggerOptions = {
      level: process.env.LOG_LEVEL || "info",
      base: undefined, // Désactive les champs par défaut
      timestamp: () => `,"time":"${new Date().toISOString()}"`,

      customLevels: {
        blockchain: 35, // entre info 30 et warn 40
      },

      serializers: {
        err: (error: Error) => ({
          type: error.name,
          message: error.message,
          stack: error.stack,
        }),
      },
    };

    this.logger = pino(options, pino.multistream(streams)) as CustomLogger;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }

    return Logger.instance;
  }

  public getChainLogger(chainId: string): CustomLogger {
    if (!this.chainLoggers.has(chainId)) {
      this.chainLoggers.set(
        chainId,
        this.logger.child({
          chainId,
          component: "blockchain",
          name: `CHAIN[${chainId}]`
        }) as CustomLogger,
      );
    }

    return this.chainLoggers.get(chainId)!;
  }

  public getComponentLogger(component: string): CustomLogger {
    return this.logger.child({
      component
    }) as CustomLogger
  }

  public info(message: string, metadata: LogMetadata = {}): void {
    this.logger.info(metadata, message);
  }

  public error(
    message: string,
    error: Error,
    metadata: LogMetadata = {},
  ): void {
    this.logger.error(
      {
        ...metadata,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      },
      message,
    );
  }
  public warn(message: string, metadata: LogMetadata = {}): void {
    this.logger.warn(metadata, message);
  }

  public debug(message: string, metadata: LogMetadata = {}): void {
    this.logger.debug(metadata, message);
  }

  public trace(message: string, metadata: LogMetadata = {}): void {
    this.logger.trace(metadata, message);
  }

  // Méthode spéciale pour les événements blockchain
  public blockchain(message: string, metadata: LogMetadata = {}): void {
    this.logger.blockchain(metadata, message);
  }
}
