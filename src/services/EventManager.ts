import { Logger } from "../core/Logger";
import { BlockchainEvent } from "../types/listener";
import {
  Subscription,
  SubscriptionEntry,
  SubscriptionMap,
} from "../types/webSocket";
import { PubsubService } from "./pubsubService";

interface BufferedClient {
  disconnectedAt: Date;
  subscriptions: SubscriptionEntry;
  bufferedEvents: BlockchainEvent[];
}

export class EventManager {
  private static instance: EventManager;
  private readonly logger: Logger;
  private readonly pubsub: PubsubService;
  private subscriptions: SubscriptionMap = {};
  private disconnectedClients: Map<string, BufferedClient> = new Map();
  private readonly BUFFER_TIMEOUT_MS = 60 * 1000; // 1 minute

  private constructor() {
    this.logger = Logger.getInstance();
    this.pubsub = PubsubService.getInstance();
  }

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }

    return EventManager.instance;
  }

  public start() {
    this.pubsub.subscribe("blockchainevent", (event: BlockchainEvent) => {
      this.handleBlockchainEvent(event);
    });

    this.pubsub.subscribe(
      "subscription:add",
      ({ uid, event }: { uid: string; event: Subscription }) => {
        this.handleNewSubscription(uid, event);
      },
    );
    this.pubsub.subscribe("subscription:remove", (uid) =>
      this.handleRemoveSubscription(uid),
    );
  }

  private handleBlockchainEvent(event: BlockchainEvent) {
    this.logger.debug(`Processing blockchain event`, {
      component: "EventManager",
      chainId: event.chainId,
      eventType: event.eventType,
    });

    const [category, subCategory] = event.eventType.split(":");

    this.checkSubscriptionMatches(event, "all", "all");
    this.checkSubscriptionMatches(event, category, "all");

    if (subCategory) {
      this.checkSubscriptionMatches(event, category, subCategory);
    }
  }

  private handleNewSubscription(uid: string, sub: Subscription) {
    const bufferedClient = this.disconnectedClients.get(uid);
    if (bufferedClient) {
      const events = bufferedClient.bufferedEvents;
      if (events.length > 0) {
        this.logger.debug(
          `Sending ${events.length} buffered events to reconnected client ${uid}`,
        );
        events.forEach((event) => {
          this.pubsub.publish("event:match", { uid, event });
        });
      }
      this.disconnectedClients.delete(uid);
    }

    const [category, subCategory = "all"] = sub.eventType.split(":");

    if (!this.subscriptions[category]) {
      this.subscriptions[category] = {};
    }
    if (!this.subscriptions[category][subCategory]) {
      this.subscriptions[category][subCategory] = new Map();
    }

    const subscriptionMap = this.subscriptions[category][subCategory];
    const existingEntry = subscriptionMap.get(uid);

    if (existingEntry) {
      existingEntry.subscriptions.push(sub);
    } else {
      subscriptionMap.set(uid, { uid, subscriptions: [sub] });
    }

    this.logger.debug(`Added subscription for ${uid}`, {
      sub,
      category,
      subCategory,
    });
  }

  private handleRemoveSubscription(uid: string) {
    // Store the client's subscriptions before removing them
    const clientSubscriptions: SubscriptionEntry = {
      uid,
      subscriptions: [],
    };

    Object.keys(this.subscriptions).forEach((category) => {
      Object.keys(this.subscriptions[category]).forEach((subCategory) => {
        const entry = this.subscriptions[category][subCategory].get(uid);
        if (entry) {
          clientSubscriptions.subscriptions.push(...entry.subscriptions);
        }
      });
    });

    // Store disconnected client info if they had active subscriptions
    if (clientSubscriptions.subscriptions.length > 0) {
      this.disconnectedClients.set(uid, {
        disconnectedAt: new Date(),
        subscriptions: clientSubscriptions,
        bufferedEvents: [],
      });

      // Schedule cleanup after buffer timeout
      setTimeout(() => {
        const client = this.disconnectedClients.get(uid);
        if (client) {
          this.disconnectedClients.delete(uid);
          // Delete subscriptions
          Object.keys(this.subscriptions).forEach((category) => {
            Object.keys(this.subscriptions[category]).forEach((subCategory) => {
              this.subscriptions[category][subCategory].delete(uid);
              if (this.subscriptions[category][subCategory].size === 0) {
                delete this.subscriptions[category][subCategory];
              }
            });

            if (Object.keys(this.subscriptions[category]).length === 0) {
              delete this.subscriptions[category];
            }

            this.logger.debug(
              `Removing buffered subscriptions for ${uid} due to timeout`,
            );
          });
        }
      }, this.BUFFER_TIMEOUT_MS);
    }

    this.logger.debug(
      `Buffered ${clientSubscriptions.subscriptions.length} subscriptions for ${uid}`,
    );
  }

  private checkSubscriptionMatches(
    event: BlockchainEvent,
    category: string,
    subCategory: string,
  ) {
    if (!this.subscriptions[category]?.[subCategory]) return;

    for (const [_, entry] of this.subscriptions[category][subCategory]) {
      const matchingSubscriptions = entry.subscriptions.filter((sub) =>
        this.doestEventMatchSubscription(event, sub, category, subCategory),
      );

      if (matchingSubscriptions.length > 0) {
        const disconnectedClients = this.disconnectedClients.get(entry.uid);
        if (disconnectedClients) {
          disconnectedClients.bufferedEvents.push(event);
        } else {
          this.pubsub.publish("event:match", { uid: entry.uid, event });
        }
      }
    }
  }

  private doestEventMatchSubscription(
    event: BlockchainEvent,
    sub: Subscription,
    category: string,
    subCategory: string,
  ): boolean {
    if (sub.params.chainId && sub.params.chainId !== event.chainId)
      return false;

    if (category === "wallet") {
      if (
        sub.params.address &&
        event.data.affectedAddresses &&
        !event.data.affectedAddresses.includes(sub.params.address)
      )
        return false;
    }

    return true;
  }
}
