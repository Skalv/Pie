export interface SubscriptionParams {
  address?: string;
  chainId?: string;
}

export interface Subscription {
  eventType: string;
  params: SubscriptionParams;
}

export interface SubscriptionEntry {
  uid: string;
  subscriptions: Subscription[];
}

export type SubscriptionMap = {
  [category: string]: {
    [subCategory: string]: Map<string, SubscriptionEntry>
  }
}

export interface WSMessage {
  action: string;
  events: Subscription[];
}
