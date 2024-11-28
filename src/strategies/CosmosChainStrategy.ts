import { Registry } from "@cosmjs/proto-signing";
import { CosmosChainStrategy } from "../types/cosmos";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { Logger } from "../core/Logger";

export default class DefaultCosmosStrategy implements CosmosChainStrategy {
  protected readonly rpcEndpoint: string;
  protected readonly restEndpoint: string;
  protected registry: Registry;
  protected logger: Logger

  constructor(rpcEndpoint: string, restEndpoint: string) {
    this.rpcEndpoint = rpcEndpoint;
    this.restEndpoint = restEndpoint;

    this.registry = new Registry(defaultRegistryTypes);
    this.logger = Logger.getInstance()
  }

  async fetchBalance(
    address: string,
  ): Promise<{ denom: string; amount: string }[]> {
    const response = await fetch(
      `${this.restEndpoint}/cosmos/bank/v1beta1/balances/${address}`,
    );
    const balances = await response.json();

    return balances.data.balances;
  }

  async fetchDelegation(address: string): Promise<any[]> {
    const response = await fetch(
      `${this.restEndpoint}/cosmos/staking/v1beta1/delegations/${address}`,
    );
    const delegation = await response.json();

    return delegation.data;
  }

  async fetchRewards(address: string): Promise<any[]> {
    const response = await fetch(
      `${this.restEndpoint}/cosmos/distribution/v1beta1/delegators/${address}/rewards`,
    );
    const rewards = await response.json();

    return rewards.data;
  }

  parseTransaction(message: any): any {
    const decodedMsg = this.registry.decode(message);
    return this.formatMessage(message.typeUrl, decodedMsg)
  }

  formatMessage(typeUrl:string, decodedMsg: any) {
    switch (typeUrl) {
      case "/cosmos.bank.v1beta1.MsgSend":
        return {
          type: "wallet:msgSend",
          data: {
            affectedAddresses: [decodedMsg.fromAddress, decodedMsg.toAddress],
            from: decodedMsg.fromAddress,
            to: decodedMsg.toAddress,
            amount: decodedMsg.amount,
          },
        };
      case "/cosmos.staking.v1beta1.MsgDelegate":
        return {
          type: "wallet:delegate",
          data: {
            affectedAddresses: [
              decodedMsg.delegatorAddress,
              decodedMsg.validatorAddress,
            ],
            delegator: decodedMsg.delegatorAddress,
            validator: decodedMsg.validatorAddress,
            amount: decodedMsg.amount,
          },
        };
      case "/cosmos.staking.v1beta1.MsgUndelegate":
        return {
          type: "wallet:undelegate",
          data: {
            affectedAddresses: [
              decodedMsg.delegatorAddress,
              decodedMsg.validatorAddress,
            ],
            delegator: decodedMsg.delegatorAddress,
            validator: decodedMsg.validatorAddress,
            amount: decodedMsg.amount,
          },
        };
      case "/cosmos.staking.v1beta1.MsgBeginRedelegate":
        return {
          type: "wallet:redelegate",
          data: {
            decodedMsg,
          },
        };
      case "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward":
        return {
          type: "wallet:claimRewards",
          data: {
            affectedAddresses: [
              decodedMsg.delegatorAddress,
              decodedMsg.validatorAddress,
            ],
            delegator: decodedMsg.delegatorAddress,
            validator: decodedMsg.validatorAddress,
          },
        };
      case "/cosmwasm.wasm.v1.MsgExecuteContract":
        return {
          type: "contract:execute",
          data: {
            ...decodedMsg,
          },
        };
      case "/cosmwasm.wasm.v1.MsgInstantiateContract":
        return {
          type: "contract:instantiate",
          data: {
            ...decodedMsg,
          },
        };
      case "/ibc.applications.transfer.v1.MsgTransfer":
        return {
          type: "ibc:transfert",
          data: {
            affectedAddresses: [decodedMsg.sender, decodedMsg.receiver],
            sender: decodedMsg.sender,
            receiver: decodedMsg.receiver,
            sourceChannel: decodedMsg.sourceChannel,
            amount: decodedMsg.token,
          },
        };
      case "/cosmos.gov.v1beta1.MsgVote":
        return {
          type: "gov:vote",
          data: {
            decodedMsg,
          },
        };
      case "/cosmos.authz.v1beta1.MsgExec":
        return {
          type: "auth:exec",
          data: {
            decodedMsg,
          },
        };
      case "/cosmos.authz.v1beta1.MsgGrant":
        return {
          type: "auth:grant",
          data: {
            decodedMsg,
          },
        };
      case "/ibc.core.channel.v1.MsgAcknowledgement":
        return {
          type: "ibc:msgAcknowledgement",
          data: {
            decodedMsg,
          },
        };
      case "/ibc.core.channel.v1.MsgRecvPacket":
        return {
          type: "ibc:msgRecvPacket",
          data: {
            decodedMsg,
          },
        };
      case "/ibc.core.client.v1.MsgUpdateClient":
        return {
          type: "ibc:msgUpdateClient",
          data: {
            decodedMsg,
          },
        };
      default:
        return null;
    }
  }
}
