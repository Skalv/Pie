import { Counter, Gauge, Registry } from "prom-client";

export class MetricsService {
  private static instance: MetricsService;
  private registry: Registry;

  // Listener Metrics
  private activeListener: Gauge
  // Websocket Metrics
  private activeWSConnections: Gauge;
  private totalWSConnections: Counter;
  // Systems Metrics
  private memoryUsage: Gauge;

  private constructor() {
    this.registry = new Registry()

    // init listener's metrics
    this.activeListener = new Gauge({
      name: 'listener_active',
      help: 'Number of active blockchain listener',
      registers: [this.registry]
    })

    // init system's metrics
    this.activeWSConnections = new Gauge({
      name: 'ws_active_connections',
      help: 'Number of active Websocket connections',
      registers: [this.registry]
    });
    this.totalWSConnections = new Counter({
      name: "ws_connections_total",
      help: 'Total Websocket connections made',
      registers: [this.registry]
    })

    // init system's metrics
    this.memoryUsage = new Gauge({
      name: 'app_memory_usage_bytes',
      help: "Application memory usage in bytes",
      registers: [this.registry]
    })
    this.collecSystemMetrics()
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService()
    }

    return MetricsService.instance
  }

  // Listeners
  public updateActiveListener(count: number) {
    this.activeListener.set(count)
  }

  // WS
  public updateActiveWSConnections(count: number) {
    this.activeWSConnections.set(count)
  }
  public incWSConnections() {
    this.totalWSConnections.inc()
  }
  
  // System
  private collecSystemMetrics() {
    setInterval(() => {
      const used = process.memoryUsage()
      this.memoryUsage.set(used.heapUsed)
    }, 10000)
  }

  // Endpoint for prometheus
  public metrics(): Promise<string> {
    return this.registry.metrics()
  }
}
