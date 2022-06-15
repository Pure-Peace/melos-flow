import {executeScript, sendTransaction} from 'flow-cadut';
import {BaseSDK} from './base';

import {AuthAccount, FlowAddress, UFix64} from '../../sdk/types';

import CommonScripts from '../../sdk-code/scripts/common';
import CommonTransactions from '../../sdk-code/transactions/common';
import {toUFix64} from '../../sdk/common';

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
    account: AuthAccount,
    path: string,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.unlink, {CAPABILITY_PATH: path, ...options?.replaceMap}),
      args: [],
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async mintFusd(
    minter: AuthAccount,
    amount: number,
    to: FlowAddress,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.mintFusd, options?.replaceMap),
      args: [toUFix64(amount), to],
      payer: minter.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async setupFusdMinter(
    minter: AuthAccount,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.setupFusdMinter, options?.replaceMap),
      args: [],
      payer: minter.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async setupFusdVault(
    user: AuthAccount,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.setupFusdVault, options?.replaceMap),
      args: [],
      payer: user.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async depositFusdMinter(
    admin: AuthAccount,
    minterAddress: FlowAddress,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(CommonTransactions.depositFusdMinter, options?.replaceMap),
      args: [minterAddress],
      payer: admin.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }
}
