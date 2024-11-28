import { Registry } from "@cosmjs/proto-signing";
import DefaultCosmosStrategy from "./CosmosChainStrategy";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { liquidityProtoRegistry, osmosisProtoRegistry } from "@ninion/protos";

export default class ChihuahuaStrategy extends DefaultCosmosStrategy {
  protected registry: Registry;

  constructor(rpcEndpoint: string, restEndpoint: string) {
    super(rpcEndpoint, restEndpoint);

    this.registry = new Registry([
      ...defaultRegistryTypes,
      ...liquidityProtoRegistry,
      ...osmosisProtoRegistry
    ]);
  }

  parseTransaction(message: any) {
    const decodedMsg = this.registry.decode(message);

    return (
      super.formatMessage(message.typeUrl, decodedMsg) ||
      this.formatMessage(message.typeUrl, decodedMsg)
    );
  }

  formatMessage(typeUrl: string, decodedMsg: any) {
    switch (typeUrl) {
      case "/liquidity.v1beta1.MsgDepositWithinBatch":
        return {
          type: "liquidity:depositBatch",
          data: {
            affectedAddresses: [decodedMsg.depositorAddress],
            ...decodedMsg,
          },
        };
      case "/liquidity.v1beta1.MsgDirectSwap":
        return {
          type: "liquidity:directSwap",
          data: {
            affectedAddresses: [decodedMsg.swapRequesterAddress],
            ...decodedMsg,
          },
        };
      case "/osmosis.tokenfactory.v1beta1.MsgCreateDenom":
        return {
          type: "tokenFactory:createDenom",
          data: {
            affectedAddresses: [decodedMsg.sender],
            ...decodedMsg
          }
        }
      case "/osmosis.tokenfactory.v1beta1.MsgMint":
        return {
          type: "tokenFactory:mint",
          data: {
            affectedAddresses: [decodedMsg.sender],
            ...decodedMsg
          }
        }
      case "/osmosis.tokenfactory.v1beta1.MsgSetDenomMetadata":
        return {
          type: "tokenFactory:setMetadata",
          data: {
            affectedAddresses: [decodedMsg.sender],
            ...decodedMsg
          }
        }
      default:
        this.logger.debug(`Unsupported type: ${typeUrl}`, decodedMsg)
        return null;
    }
  }
}
