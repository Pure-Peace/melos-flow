export const TESTNET_ADDRESS = 'https://access-testnet.onflow.org';
export const EMULATOR_PORT = 8080;
export const EMULATOR_ADDRESS = `http://127.0.0.1:${EMULATOR_PORT}`;

export const MINT_AMOUNT = 10000;

export const CONTRACTS: Record<Contracts, string> = {
  NonFungibleToken: 'NonFungibleToken',
};

type Contracts = 'NonFungibleToken';

type TestAccount = {
  address: string;
  privKey: string;
  pubKey: string;
};

export type FlowNetwork = 'emulator' | 'testnet' | 'mainnet';

type Config = {
  mainAddressMap: Record<string, string>;
};
