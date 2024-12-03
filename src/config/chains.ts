import { ListenerConfig } from "../types/listener";

export const Chains: ListenerConfig[] = [
  {
    id: "cosmoshub",
    chainId: "cosmos:cosmoshub-4",
    rpcEndpoint: "https://cosmos-rpc.polkachu.com",
    restEndpoint: "https://cosmosgub.lava.build:443",
    eventTypes: ["NewBlock"],
    enabled: false
  },
  {
    id: "chihuahua",
    chainId: "cosmos:chihuahua-1",
    rpcEndpoint: "https://rpc.chihuahua.wtf",
    restEndpoint: "https://api.chihuahua.wtf",
    // rpcEndpoint: "http://127.0.0.1:26657",
    // restEndpoint: "http://127.0.0.1:433",
    eventTypes: ["NewBlock"],
    enabled: true,
    strategyName: "ChihuahuaStrategy"
  }
]
