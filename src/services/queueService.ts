import Queue from "bull"
import { Logger } from "../core/Logger";

export class QueueService {
  private static instance: QueueService
  private queues: Map<string, Queue.Queue>;
  private logger: Logger;

  constructor() {
    this.queues = new Map()
    this.logger = Logger.getInstance()
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService()
    }

    return QueueService.instance
  }

  private getQueue(name: string): Queue.Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379
        }
      })
      this.queues.set(name, queue)
      this.logger.debug(`Queue ${name} added`)
    }

    return this.queues.get(name)!;
  }

  public async addJob(queuename: string, data: any, options: Queue.JobOptions = {}): Promise<Queue.Job> {
    const queue = this.getQueue(queuename)

    return queue.add(data, options)
  }

  public processJob(queueName: string, processor: Queue.ProcessCallbackFunction<any>): void {
    const queue = this.getQueue(queueName)
    queue.process(processor)
  }
}
