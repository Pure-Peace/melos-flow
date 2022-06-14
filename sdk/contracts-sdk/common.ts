import {executeScript} from 'flow-cadut';
import {UFix64} from 'sdk/types';
import CommonScripts from '../../sdk-code/scripts/common';
import {BaseSDK} from './base';

export class CommonSDK extends BaseSDK {
  async getBlockTime(options?: {addressMap?: Record<string, string>; limit?: number}) {
    return executeScript<UFix64>({
      code: CommonScripts.getBlockTime,
      args: [],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getFlowBalance(address: string, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return executeScript<UFix64>({
      code: CommonScripts.getFlowBalance,
      args: [address],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }
}
