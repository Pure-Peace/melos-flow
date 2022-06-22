import {DEFAULT_LIMIT} from '../common';

export class BaseSDK {
  addressMap: Record<string, string>;
  replaceMap?: Record<string, string>;
  limit: number;

  constructor(addressMap: Record<string, string>, replaceMap?: Record<string, string>, limit: number = DEFAULT_LIMIT) {
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
