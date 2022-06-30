import {RawTxResult} from './transaction';

export type FlowNetwork = 'emulator' | 'testnet' | 'mainnet';
export type FlowCurrency = 'FLOW' | 'FUSD';
export type FlowEnv = Record<string, any>;

export type UFix64 = string;
export type FlowType = string;
export type FlowAddress = string;

export type CreateFlowEmulatorParams = {
  logs?: boolean;
  logLevel?: ('debug' | 'info' | 'warning')[];
};

export type FlowTypeObject = {
  kind: string;
  typeID: FlowType;
  fields: any[];
  initializers: any[];
  type: string;
};

export type DeploymentsConfig = Record<
  string,
  | string
  | {
      name: string;
      args: {
        type: string;
        value: string;
      }[];
    }[]
>;

export interface Account {
  name?: string;
  address: string;
  key: string;
}

export interface AuthAccount extends Account {
  auth: FlowAuthorize;
}

export type AccountsConfig = Record<string, Account>;

export type RawTransactionResponse = {
  txId: string;
  subscribe: (handle: (tx) => any) => () => Promise<any>;
  seal: () => Promise<RawTxResult>;
  exec: () => Promise<RawTxResult>;
  final: () => Promise<RawTxResult>;
};
export type AuthWithPrivateKey = undefined | ((account?: any) => Promise<any>);

export enum FlowTxStatus {
  UNKNOWN = 0,
  PENDING = 1,
  FINALIZED = 2,
  EXECUTED = 3,
  SEALED = 4,
  EXPIRED = 5,
}

export type TransactionEvent = {
  type: string;
  [key: string]: any;
};

export type CommonFlowTransaction = {
  status: FlowTxStatus;
  statusCode: number;
  errorMessage: string;
  events: TransactionEvent[];
};
export interface FlowTransaction extends CommonFlowTransaction {
  txId: string;
}

export type MethodArgs = {
  cadence: string;
  args?: any;
};

export type FlowSigningFunctionResponse = {addr: string; keyId: number; signature: string};
export type FlowSigningFunction = (signable: {message: string}) => FlowSigningFunctionResponse;
export type FlowAuthorizeResponce = {
  tempId: string;
  addr: string;
  keyId: number;
  signingFunction: FlowSigningFunction;
};
export type FlowAuthorize = (account: any) => Promise<FlowAuthorizeResponce>;

export type FungibleTokenReplaceMap = {
  FT_NAME: string;
  FT_RECEIVER: string;
  FT_ADDRESS: string;
  FT_STORAGE_PATH: string;
};

export type NonFungibleTokenReplaceMap = {
  NFT_NAME: string;
  NFT_ADDRESS: string;
  NFT_PROVIDER_PRIVATE_PATH: string;
  NFT_PUBLIC_PATH: string;
  NFT_STORAGE_PATH: string;
};

export type TxResult = {
  txId: {
    tag: string;
    transaction?: any;
    transactionStatus?: any;
    transactionId: string;
    encodedData?: any;
    events?: any;
    account?: any;
    block?: any;
    blockHeader?: any;
    latestBlock?: any;
    collection?: any;
  };
  status: number;
  statusString: string;
  statusCode: number;
  errorMessage: string;
  events: any[];
};

export type ReplaceMap = FungibleTokenReplaceMap & NonFungibleTokenReplaceMap;
export type FlowValue = {
  type: string;
  value: string | number | null | FlowValue;
};

export type ScanResult = {
  blockId: Uint8Array;
  blockHeight: number;
  type: string;
  transactionId: string;
  transactionIndex: number;
  eventIndex: number;
  payload: {
    type: string;
    value: {
      id: string;
      fields: {name: string; value: FlowValue}[];
    };
  };
};
