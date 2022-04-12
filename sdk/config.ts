import flowConfig from '../flow.json';

import { toFlowAddress } from './common';

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

/* export const FLOW_TESTNET_ACCOUNT_1: TestAccount = {
  address: "0x285b7909b8ed1652",
  privKey: "90a0c5a6cf05794f2e1104ca4be77895d8bfd8d4681eba3552ac5723f585b91c",
  pubKey: "12955691c2f82ebcda217af08f4619a96eb5991b95ac7c9c846e854f2164bc1048ed7f0ed5daa97ea37a638ea9d97b3e6981cd189d4a927a0244258e937d0fc4",
} */

export function getEmulatorPrivateKey() {
  return flowConfig.accounts['emulator-account'].key;
}

export type FlowNetwork = 'emulator' | 'testnet' | 'mainnet';

type Config = {
  mainAddressMap: Record<string, string>;
};

export const CONFIGS: Record<FlowNetwork, Config> = {
  emulator: {
    mainAddressMap: {
      NonFungibleToken: EMULATOR_ADDRESS,
      FungibleToken: toFlowAddress('0xee82856bf20e2aa6'),
      FlowToken: toFlowAddress('0x0ae53cb6e3f42a79'),
      FUSD: EMULATOR_ADDRESS,
      NFTStorefront: EMULATOR_ADDRESS,
    },
  },
  testnet: {
    mainAddressMap: {
      NonFungibleToken: toFlowAddress('0x631e88ae7f1d7c20'),
      FungibleToken: toFlowAddress('0x9a0766d93b6608b7'),
      FUSD: toFlowAddress('0xe223d8a629e49c68'),
      FlowToken: toFlowAddress('0x7e60df042a9c0868'),
      NFTStorefront: toFlowAddress('0x94b06cfca1d8a476'),
    },
  },
  mainnet: {
    mainAddressMap: {
      NonFungibleToken: toFlowAddress('0x1d7e57aa55817448'),
      FungibleToken: toFlowAddress('0xf233dcee88fe0abe'),
      FUSD: toFlowAddress('0x3c5959b568896393'),
      FlowToken: toFlowAddress('0x1654653399040a61'),
      NFTStorefront: toFlowAddress('0x4eb8a10cb9f87357'),
    },
  },
};
