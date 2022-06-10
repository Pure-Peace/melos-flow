import {UFix64, FlowAddress} from '../../sdk/types';

export type FungibleTokensWithdrawnEvent = {
  amount: UFix64;
  from: FlowAddress;
};

export type FungibleTokensDepositedEvent = {
  amount: UFix64;
  to: FlowAddress;
};
