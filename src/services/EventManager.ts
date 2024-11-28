import { Logger } from "../core/Logger";
import { BlockchainEvent } from "../types/listener";
import {
  Subscription,
  SubscriptionEntry,
  SubscriptionMap,
} from "../types/webSocket";
import { PubsubService } from "./pubsubService";

export class EventManager {
  private static instance: EventManager;
  private readonly logger: Logger;
  private readonly pubsub: PubsubService;
  private subscriptions: SubscriptionMap = {};

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

    this.checkSubscriptionMatches(event, "all", "all")
    this.checkSubscriptionMatches(event, category, "all");

    if (subCategory) {
      this.checkSubscriptionMatches(event, category, subCategory);
    }
  }

  private handleNewSubscription(uid: string, sub: Subscription) {
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
    });

    this.logger.debug(`Removed all subscriptions for ${uid}`);
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
        this.pubsub.publish("event:match", { uid: entry.uid, event });
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
