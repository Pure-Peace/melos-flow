import {FlowAuthorizeMinter} from './flow-service';

export type FlowNetwork = 'emulator' | 'testnet' | 'mainnet';
export type FlowCurrency = 'FLOW' | 'FUSD';

export type UFix64 = string;
export type FlowType = string;
export type FlowAddress = string;

export type CreateFlowEmulatorParams = {
  logs?: boolean;
  logLevel?: ('debug' | 'info' | 'warning')[];
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
  auth: FlowAuthorizeMinter;
}

export type AccountsConfig = Record<string, Account>;
