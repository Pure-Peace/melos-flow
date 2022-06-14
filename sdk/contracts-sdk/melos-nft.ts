import {sendTransaction, executeScript} from 'flow-cadut';
import {AuthAccount} from '../types';
import {BaseSDK} from './base';

import MelosNftTransactions from '../../sdk-code/transactions/melos-nft';
import MelosNftScripts from '../../sdk-code/scripts/melos-nft';

export class MelosNFTSDK extends BaseSDK {
  async setupCollection(account: AuthAccount, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return sendTransaction({
      code: MelosNftTransactions.setupCollection,
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  /**
   * Returns Melos supply.
   * @throws Will throw an error if execution will be halted
   * */
  async totalSupply(options?: {addressMap?: Record<string, string>; limit?: number}) {
    return executeScript<number>({
      code: MelosNftScripts.totalSupply,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  /**
   * Mints Melos to **recipient**.
   * */
  async mint(minter: AuthAccount, recipient: string, options?: {addressMap?: Record<string, string>; limit?: number}) {
    return sendTransaction({
      code: MelosNftTransactions.mint,
      args: [recipient],
      payer: minter.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  /**
   * Transfers Melos NFT with id equal **itemId** from **sender** account to **recipient**.
   * @param {AuthAccount} sender - sender
   * @param {string} recipient - recipient address
   * @param {UInt64} itemId - id of the item to transfer
   * */
  async transfer(
    sender: AuthAccount,
    recipient: string,
    itemId: number,
    options?: {addressMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: MelosNftTransactions.transfer,
      args: [itemId, recipient],
      payer: sender.auth,
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
  async balanceOf(address: string, options?: {addressMap?: Record<string, string>; limit?: number}) {
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
}
