import MelosNftTransactions from '../../sdk-code/transactions/melos-nft';
import MelosNftScripts from '../../sdk-code/scripts/melos-nft';

import {BaseSDK} from './base';
import {executeScript, sendTransaction} from '../transaction';
import {FlowAuthorize} from '../types';

export class MelosNFTSDK extends BaseSDK {
  async setupCollection(auth: FlowAuthorize, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return sendTransaction({
      code: MelosNftTransactions.setupCollection,
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async removeCollection(auth: FlowAuthorize, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return sendTransaction({
      code: MelosNftTransactions.removeCollection,
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async totalSupply(options?: {addressMap?: Record<string, string>; limit?: number}) {
    return executeScript<number>({
      code: MelosNftScripts.totalSupply,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async transfer(
    auth: FlowAuthorize,
    recipient: string,
    nftId: number,
    options?: {addressMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: MelosNftTransactions.transfer,
      args: [recipient, nftId],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getAccountNFTs(address: string, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return executeScript<number[]>({
      code: MelosNftScripts.getAccountNFTs,
      args: [address],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  /**
   * Returns the number of Melos in an account's collection.
   * @param {string} address - account address
   * */
  async getAccountBalance(address: string, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return executeScript<number>({
      code: MelosNftScripts.getAccountBalance,
      args: [address],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getAccountHasNFT(
    address: string,
    nftId: number,
    options?: {addressMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<boolean>({
      code: MelosNftScripts.getAccountHasNFT,
      args: [address, nftId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async viewNFTData(address: string, nftId: number, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return executeScript<string>({
      code: MelosNftScripts.viewNFTData,
      args: [address, nftId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async checkAccount(address: string, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return executeScript<boolean>({
      code: MelosNftScripts.checkAccount,
      args: [address],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async burn(auth: FlowAuthorize, nftId: number, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return sendTransaction({
      code: MelosNftTransactions.burn,
      args: [nftId],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  /**
   * Mints amount of Melos to **recipient**.
   * */
  async mint(
    auth: FlowAuthorize,
    recipient: string,
    amount: number,
    options?: {addressMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: MelosNftTransactions.mint,
      args: [recipient, amount],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async batchMint(
    auth: FlowAuthorize,
    amounts: number[],
    recipients: string[],
    options?: {addressMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: MelosNftTransactions.batchMint,
      args: [amounts, recipients],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async batchTransfer(
    auth: FlowAuthorize,
    tokenIds: number[],
    recipients: string[],
    options?: {addressMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: MelosNftTransactions.batchTransfer,
      args: [tokenIds, recipients],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }
}
