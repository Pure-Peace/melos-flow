export const TESTING_ADDRESS_MAP = {
  NonFungibleToken: '0xf8d6e0586b0a20c7',
  MelosNFT: '0xf8d6e0586b0a20c7',
  MelosMarketplace: '0xf8d6e0586b0a20c7',
  FUSD: '0xf8d6e0586b0a20c7',
};

export const FLOW_TOKEN_EMULATOR = {
  FT_NAME: 'FlowToken',
  FT_RECEIVER: '/public/flowTokenReceiver',
  FT_ADDRESS: '"../../contracts/core/FlowToken.cdc"',
  FT_STORAGE_PATH: '/storage/flowTokenVault',
};

export const FUSD_TOKEN_EMULATOR = {
  FT_NAME: 'FUSD',
  FT_RECEIVER: '/public/fusdReceiver',
  FT_ADDRESS: '"../../contracts/core/FUSD.cdc"',
  FT_STORAGE_PATH: '/storage/fusdVault',
};

export const MELOS_NFT_EMULATOR = {
  NFT_NAME: 'MelosNFT',
  NFT_ADDRESS: '"../../contracts/MelosNFT.cdc"',
  NFT_PROVIDER_PRIVATE_PATH: '/private/MelosNFTCollectionProviderPrivatePath',
  NFT_PUBLIC_PATH: 'MelosNFT.CollectionPublicPath',
  NFT_STORAGE_PATH: 'MelosNFT.CollectionStoragePath',
};

export const EMULATOR_REPLACE_MAP = {
  ...MELOS_NFT_EMULATOR,
  ...FLOW_TOKEN_EMULATOR,
};

export const DEFAULT_LIMIT = 999;

export class BaseSDK {
  addressMap: Record<string, string>;
  limit: number;
  replaceMap?: Record<string, string>;

  constructor(addressMap: Record<string, string>, limit?: number, replaceMap?: Record<string, string>) {
    this.addressMap = addressMap;
    this.limit = limit || DEFAULT_LIMIT;
    this.replaceMap = replaceMap;
  }

  setAddressMap(addressMap: Record<string, string>) {
    this.addressMap = addressMap;
  }

  setReplaceMap(replaceMap?: Record<string, string>) {
    this.replaceMap = replaceMap;
  }

  setLimit(limit: number) {
    this.limit = limit;
  }

  code(code: string, replaceMap?: Record<string, string>) {
    const map = {...replaceMap, ...this.replaceMap};
    if (!map) {
      return code;
    }

    for (const [k, v] of Object.entries(map)) {
      code = code.replace(new RegExp(`%${k}%`, 'g'), v);
    }
    return code;
  }
}
