import {BaseSDK} from './base';

import CommonScripts from '../../sdk-code/scripts/common';
import CommonTransactions from '../../sdk-code/transactions/common';

import {executeScript, sendTransaction} from '../transaction';
import {FlowAddress, FlowAuthorize, UFix64} from '../types';
import {toUFix64} from '../common';

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

  async getFusdBalance(address: string, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return executeScript<UFix64>({
      code: CommonScripts.getFusdBalance,
      args: [address],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async unlink(
    auth: FlowAuthorize,
    path: string,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.unlink, {CAPABILITY_PATH: path, ...options?.replaceMap}),
      args: [],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async link(
    auth: FlowAuthorize,
    target: string,
    targetPath: string,
    capabilityPath: string,
    imports?: Record<string, FlowAddress>,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    let _imports = '';
    if (imports) {
      for (const [contract, addr] of Object.entries(imports)) {
        _imports += `import ${contract} from ${addr}\n`;
      }
    }
    return sendTransaction({
      code: this.code(CommonTransactions.link.replace(new RegExp(`%IMPORTS%`, 'g'), _imports), {
        LINK_TARGET: target,
        TARGET_PATH: targetPath,
        CAPABILITY_PATH: capabilityPath,
        ...options?.replaceMap,
      }),
      args: [],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async mintFusd(
    auth: FlowAuthorize,
    amount: number,
    to: FlowAddress,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.mintFusd, options?.replaceMap),
      args: [toUFix64(amount), to],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async setupFusdMinter(
    auth: FlowAuthorize,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.setupFusdMinter, options?.replaceMap),
      args: [],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async setupFusdVault(
    auth: FlowAuthorize,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.setupFusdVault, options?.replaceMap),
      args: [],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async depositFusdMinter(
    auth: FlowAuthorize,
    minterAddress: FlowAddress,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.depositFusdMinter, options?.replaceMap),
      args: [minterAddress],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }
}
