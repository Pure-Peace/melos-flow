/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {RawTxResult} from './transaction';
import {
  FungibleTokenReplaceMap,
  NonFungibleTokenReplaceMap,
  ReplaceMap,
  TxResult,
  FlowNetwork,
  FlowValue,
  ScanResult,
} from './types';

export const UFIX64_PRECISION = 8;

export const EXT_ENVIRONMENT = {
  emulator: {},
  testnet: {},
  mainnet: {},
};

export const DEPLOYED_CONTRACTS = {
  emulator: {
    FungibleToken: '0xee82856bf20e2aa6',

    FlowFees: '0xe5a8b7f23e8b548f',
    FlowStorageFees: '0xf8d6e0586b0a20c7',
    FlowToken: '0x0ae53cb6e3f42a79',
  },
  testnet: {
    FungibleToken: '0x9a0766d93b6608b7',
    NonFungibleToken: '0x631e88ae7f1d7c20',

    FlowClusterQC: '0x9eca2b38b18b5dfe',
    FlowDKG: '0x9eca2b38b18b5dfe',
    FlowEpoch: '0x9eca2b38b18b5dfe',
    FlowIDTableStaking: '0x9eca2b38b18b5dfe',
    FlowToken: '0x7e60df042a9c0868',
    LockedTokens: '0x95e019a17d0e23d7',
    StakingProxy: '0x7aad92e5a0715d21',
    FlowStakingCollection: '0x95e019a17d0e23d7',

    FUSD: '0xe223d8a629e49c68',
  },
  mainnet: {
    FungibleToken: '0xf233dcee88fe0abe',
    NonFungibleToken: '0x1d7e57aa55817448',

    FlowClusterQC: '0x8624b52f9ddcd04a',
    FlowDKG: '0x8624b52f9ddcd04a',
    FlowEpoch: '0x8624b52f9ddcd04a',
    FlowIDTableStaking: '0x8624b52f9ddcd04a',
    FlowFees: '0xf919ee77447b7497',
    FlowToken: '0x1654653399040a61',
    LockedTokens: '0x8d0e87b65159ae63',
    StakingProxy: '0x62430cf28c26d095',
    FlowStakingCollection: '0x8d0e87b65159ae63',

    FUSD: '0x3c5959b568896393',
  },
};

export const EMULATOR_ADDRESS_MAP = {
  NonFungibleToken: '0xf8d6e0586b0a20c7',
  MelosNFT: '0xf8d6e0586b0a20c7',
  MelosMarketplace: '0xf8d6e0586b0a20c7',
  FUSD: '0xf8d6e0586b0a20c7',
};

export const TESTNET_BASE_ADDRESS_MAP = {
  FungibleToken: '0x9a0766d93b6608b7',
  FlowToken: '0x7e60df042a9c0868',
  NonFungibleToken: '0x631e88ae7f1d7c20',
  FUSD: '0xe223d8a629e49c68',
  MetadataViews: '0x631e88ae7f1d7c20',
  FlowStakingCollection: '0x95e019a17d0e23d7',
  LockedTokens: '0x95e019a17d0e23d7',
  FlowEpoch: '0x9eca2b38b18b5dfe',
  FlowIDTableStaking: '0x9eca2b38b18b5dfe',
  FlowServiceAccount: '0x8c5303eaa26202d6',
  FlowFees: '0x912d5440f7e3769e',
};

export const MAINNET_BASE_ADDRESS_MAP = {
  FungibleToken: '0xf233dcee88fe0abe',
  FlowToken: '0x1654653399040a61',
  NonFungibleToken: '0x1d7e57aa55817448',
  FUSD: '0x3c5959b568896393',
  MetadataViews: '0x1d7e57aa55817448',
  FlowStakingCollection: '0x8d0e87b65159ae63',
  LockedTokens: '0x8d0e87b65159ae63',
  FlowEpoch: '0x8624b52f9ddcd04a',
  FlowIDTableStaking: '0x8624b52f9ddcd04a',
  FlowServiceAccount: '0xe467b9dd11fa00df',
  FlowFees: '0xf919ee77447b7497',
};

export function flowTokenReplaceMap(network: 'emulator' | 'testnet' | 'mainnet'): FungibleTokenReplaceMap {
  return {
    FT_NAME: 'FlowToken',
    FT_RECEIVER: '/public/flowTokenReceiver',
    FT_ADDRESS:
      network === 'testnet'
        ? TESTNET_BASE_ADDRESS_MAP.FlowToken
        : network === 'mainnet'
        ? MAINNET_BASE_ADDRESS_MAP.FlowToken
        : '../../contracts/core/FlowToken.cdc',
    FT_STORAGE_PATH: '/storage/flowTokenVault',
  };
}

export function fusdReplaceMap(network: 'emulator' | 'testnet' | 'mainnet'): FungibleTokenReplaceMap {
  return {
    FT_NAME: 'FUSD',
    FT_RECEIVER: '/public/fusdReceiver',
    FT_ADDRESS:
      network === 'testnet'
        ? TESTNET_BASE_ADDRESS_MAP.FUSD
        : network === 'mainnet'
        ? MAINNET_BASE_ADDRESS_MAP.FUSD
        : '../../contracts/core/FUSD.cdc',
    FT_STORAGE_PATH: '/storage/fusdVault',
  };
}

export function melosNftReplaceMap(nftContractAddress?: string): NonFungibleTokenReplaceMap {
  return {
    NFT_NAME: 'MelosNFT',
    NFT_ADDRESS: nftContractAddress || '"../../contracts/MelosNFT.cdc"',
    NFT_PROVIDER_PRIVATE_PATH: '/private/MelosNFTCollectionProviderPrivatePath',
    NFT_PUBLIC_PATH: 'MelosNFT.CollectionPublicPath',
    NFT_STORAGE_PATH: 'MelosNFT.CollectionStoragePath',
  };
}

export const FLOW_TOKEN_EMULATOR: FungibleTokenReplaceMap = {
  FT_NAME: 'FlowToken',
  FT_RECEIVER: '/public/flowTokenReceiver',
  FT_ADDRESS: '"../../contracts/core/FlowToken.cdc"',
  FT_STORAGE_PATH: '/storage/flowTokenVault',
};

export const FUSD_TOKEN_EMULATOR: FungibleTokenReplaceMap = {
  FT_NAME: 'FUSD',
  FT_RECEIVER: '/public/fusdReceiver',
  FT_ADDRESS: '"../../contracts/core/FUSD.cdc"',
  FT_STORAGE_PATH: '/storage/fusdVault',
};

export const MELOS_NFT_EMULATOR: NonFungibleTokenReplaceMap = {
  NFT_NAME: 'MelosNFT',
  NFT_ADDRESS: '"../../contracts/MelosNFT.cdc"',
  NFT_PROVIDER_PRIVATE_PATH: '/private/MelosNFTCollectionProviderPrivatePath',
  NFT_PUBLIC_PATH: 'MelosNFT.CollectionPublicPath',
  NFT_STORAGE_PATH: 'MelosNFT.CollectionStoragePath',
};

export const EMULATOR_REPLACE_MAP: ReplaceMap = {
  ...MELOS_NFT_EMULATOR,
  ...FLOW_TOKEN_EMULATOR,
};

export const DEFAULT_LIMIT = 999;

export function toFlowAddress(value: string) {
  let hex: string;
  if (value.startsWith('0x')) {
    hex = value.substring(2).toLowerCase();
  } else {
    hex = value.toLowerCase();
  }
  const re = /[0-9a-f]{16}/g;
  if (re.test(hex)) {
    return '0x' + hex;
  } else {
    throw new Error('not an flow address: ' + value);
  }
}

export const FLOW_ZERO_ADDRESS = toFlowAddress('0x0000000000000000');

export function eventFilter<T, E>(txResult: TxResult, contract: string, contractEvent: E) {
  const filtedEvents: T[] = [];
  for (const ev of txResult.events) {
    if (ev.type.endsWith(`${contract}.${contractEvent}`)) {
      filtedEvents.push(ev.data);
    }
  }
  return filtedEvents;
}

export function getTxEvents(txResult: TxResult) {
  return txResult.events.map((ev: any) => {
    return {type: ev.type, data: ev.data};
  });
}

export async function sleep(duration: number) {
  return new Promise((r) => setTimeout(r, duration));
}

export const toUFix64 = (value?: number) =>
  [null, undefined, NaN].includes(value) ? null : value!.toFixed(UFIX64_PRECISION);

export async function assertTx(txResultResponser: () => Promise<RawTxResult>) {
  return (await txResultResponser()).unwrap();
}

export function getMaps(network: FlowNetwork) {
  if (network === 'emulator') {
    return {addressMap: EMULATOR_ADDRESS_MAP, replaceMap: EMULATOR_REPLACE_MAP};
  }

  const MelosNFT = process.env[`${network.toUpperCase()}_MELOS_NFT_ADDRESS`]!;
  const MelosMarketplace = process.env[`${network.toUpperCase()}_MELOS_MARKETPLACE`]!;

  const addressMap = {
    ...(network === 'testnet' ? TESTNET_BASE_ADDRESS_MAP : MAINNET_BASE_ADDRESS_MAP),
    MelosNFT,
    MelosMarketplace,
  };

  const replaceMap: ReplaceMap = {
    ...flowTokenReplaceMap(network),
    ...melosNftReplaceMap(MelosNFT),
  };

  return {addressMap, replaceMap};
}

export function extractOptional(field: any) {
  if (field?.type === 'Optional' && !!field.value) {
    return extractOptional(field.value);
  }
  return field;
}

export function parseFlowType(flowType: string) {
  const result = flowType.split('.');
  if (result.length !== 4) {
    throw new Error(`Failed to parse flow type, result: ${result}`);
  }

  const [, address, contract, name] = result;
  return {
    address,
    contract,
    name,
  };
}

export class FlowEvent {
  blockHeight: number;
  type: string;
  transactionId: string;
  transactionIndex: any;
  eventIndex: number;
  data: Record<string, FlowValue>;

  constructor(res: ScanResult) {
    this.blockHeight = res.blockHeight;
    this.type = res.type;
    this.transactionId = res.transactionId;
    this.transactionIndex = res.transactionIndex;
    this.eventIndex = res.eventIndex;
    this.data = {};

    for (const field of res?.payload?.value?.fields) {
      const f = extractOptional(field.value);

      if (f.type?.startsWith('UInt') || f.type?.startsWith('Int')) {
        f.value = Number(f.value);
      } else if (f.type === 'Type') {
        f.value = f.value.staticType.typeID;
      }
      this.data[field.name] = f;
    }
  }
}
