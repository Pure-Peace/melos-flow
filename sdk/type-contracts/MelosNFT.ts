import {FlowAddress} from '../../sdk/types';

export type MelosNFTEvents = 'Minted' | 'Withdraw' | 'Deposit' | 'MetadataBaseURIChanged';

export type MelosNFTMintedEvent = {
  id: number;
  recipient: string;
};

export type MelosNFTWithdrawEvent = {
  id: number;
  from: FlowAddress;
};

export type MelosNFTDepositEvent = {
  id: number;
  to: FlowAddress;
};
