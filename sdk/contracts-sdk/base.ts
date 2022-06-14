export const TESTING_ADDRESS_MAP = {
  NonFungibleToken: '0xf8d6e0586b0a20c7',
  MelosNFT: '0xf8d6e0586b0a20c7',
  MelosMarketplace: '0xf8d6e0586b0a20c7',
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
    if (!this.replaceMap) {
      return code;
    }

    for (const [k, v] of Object.entries(replaceMap ?? this.replaceMap)) {
      code = code.replace(new RegExp(`%${k}%`, 'g'), v);
    }
    return code;
  }
}
