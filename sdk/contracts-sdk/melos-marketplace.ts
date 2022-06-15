import {sendTransaction, executeScript} from 'flow-cadut';
import {
  ListingType,
  CommonParams,
  OpenBidParams,
  DutchAuctionParams,
  EnglishAuctionParams,
  ListingDetailsQuery,
} from '../../sdk/type-contracts/MelosMarketplace';
import {toUFix64} from '../common';
import {AuthAccount, FlowAddress, UFix64} from '../types';

import MarketplaceScripts from '../../sdk-code/scripts/melos-marketplace';
import MarketplaceTransactionsTemplates from '../../sdk-code/transactions/melos-marketplace-templates';
import {BaseSDK} from './base';

export class MelosMarketplaceSDK extends BaseSDK {
  /**
   * Sets up MelosMarketplace.ListingManager on account and exposes public capability.
   * @param {string} account - account address
   * @throws Will throw an error if transaction is reverted.
   * */
  async setupListingManager(
    account: AuthAccount,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.setupListingManager, options?.replaceMap),
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  getListingCodeByType(listingType: ListingType, replaceMap?: Record<string, string>) {
    let code = '';
    switch (listingType) {
      case ListingType.Common:
        code = this.code(MarketplaceTransactionsTemplates.listingCommon, replaceMap);
        break;
      case ListingType.OpenBid:
        code = this.code(MarketplaceTransactionsTemplates.listingOpenBid, replaceMap);
        break;
      case ListingType.DutchAuction:
        code = this.code(MarketplaceTransactionsTemplates.listingDutchAuction, replaceMap);
        break;
      case ListingType.EnglishAuction:
        code = this.code(MarketplaceTransactionsTemplates.listingEnglishAuction, replaceMap);
        break;
    }
    if (!code) {
      throw new Error(`Cannot get listing code with listingType: "${listingType}"`);
    }
    return code;
  }

  async createListing(
    owner: AuthAccount,
    nftId: number,
    listingType: ListingType,
    cfg: CommonParams | OpenBidParams | DutchAuctionParams | EnglishAuctionParams,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    let args: unknown[] = [
      nftId,
      toUFix64(cfg.listingStartTime),
      toUFix64(cfg.listingDuration),
      toUFix64(cfg.royaltyPercent),
    ];
    switch (listingType) {
      case ListingType.Common:
        cfg = cfg as CommonParams;
        args = args.concat([toUFix64(cfg.price)]);
        break;
      case ListingType.OpenBid:
        cfg = cfg as OpenBidParams;
        args = args.concat([toUFix64(cfg.minimumPrice)]);
        break;
      case ListingType.DutchAuction:
        cfg = cfg as DutchAuctionParams;
        args = args.concat([toUFix64(cfg.startingPrice), toUFix64(cfg.reservePrice), toUFix64(cfg.priceCutInterval)]);
        break;
      case ListingType.EnglishAuction:
        cfg = cfg as EnglishAuctionParams;
        args = args.concat([toUFix64(cfg.reservePrice), toUFix64(cfg.minimumBidPercentage), toUFix64(cfg.basePrice)]);
        break;
    }

    return sendTransaction({
      code: this.getListingCodeByType(listingType, options?.replaceMap),
      args,
      payer: owner.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async removeListing(
    listingOwner: AuthAccount,
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.removeListing, options?.replaceMap),
      args: [listingId],
      payer: listingOwner.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async publicRemoveEndedListing(
    executor: AuthAccount,
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.publicRemoveEndedListing, options?.replaceMap),
      args: [listingId],
      payer: executor.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async purchaseListing(
    account: AuthAccount,
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.purchaseListing, options?.replaceMap),
      args: [listingId],
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getAccountListingCount(
    address: string,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<number>({
      code: MarketplaceScripts.getAccountListingCount,
      args: [address],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async setAllowedPaymentTokens(
    admin: AuthAccount,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.adminSetAllowedPaymentTokens, options?.replaceMap),
      args: [],
      payer: admin.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getAllowedPaymentTokens(options?: {
    addressMap?: Record<string, string>;
    replaceMap?: Record<string, string>;
    limit?: number;
  }) {
    return executeScript<string[]>({
      code: MarketplaceScripts.getAllowedPaymentTokens,
      args: [],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getContractIdentifier(options?: {
    addressMap?: Record<string, string>;
    replaceMap?: Record<string, string>;
    limit?: number;
  }) {
    return executeScript<string>({
      code: MarketplaceScripts.getContractIdentifier,
      args: [],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getListingDetails(
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<ListingDetailsQuery>({
      code: MarketplaceScripts.getListingDetails,
      args: [listingId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getListingExists(
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<boolean>({
      code: MarketplaceScripts.getListingExists,
      args: [listingId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getListingPurachased(
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<boolean>({
      code: MarketplaceScripts.getListingPurachased,
      args: [listingId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getListingPrice(
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<UFix64>({
      code: MarketplaceScripts.getListingPrice,
      args: [listingId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async createBid(
    buyer: AuthAccount,
    listingId: number,
    price: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.createBid, options?.replaceMap),
      args: [listingId, toUFix64(price)],
      payer: buyer.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async removeBid(
    bidder: AuthAccount,
    listingId: number,
    bidId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.removeBid, options?.replaceMap),
      args: [listingId, bidId],
      payer: bidder.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getListingSortedBids(
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<any[]>({
      code: MarketplaceScripts.getListingSortedBids,
      args: [listingId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async acceptOpenBid(
    seller: AuthAccount,
    listingId: number,
    bidId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.acceptOpenBid, options?.replaceMap),
      args: [listingId, bidId],
      payer: seller.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getListingNextBidMinimumPrice(
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<UFix64>({
      code: MarketplaceScripts.getListingNextBidMinimumPrice,
      args: [listingId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getListingTopBid(
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<any>({
      code: MarketplaceScripts.getListingTopBid,
      args: [listingId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async publicCompleteEnglishAuction(
    account: AuthAccount,
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.publicCompleteEnglishAuction, options?.replaceMap),
      args: [listingId],
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getListingEnded(
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<boolean>({
      code: MarketplaceScripts.getListingEnded,
      args: [listingId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getListingIsType(
    listingId: number,
    listingType: ListingType,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<boolean>({
      code: MarketplaceScripts.getListingIsType,
      args: [listingId, Number(listingType)],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getUnRefundPaymentsCount(options?: {
    addressMap?: Record<string, string>;
    replaceMap?: Record<string, string>;
    limit?: number;
  }) {
    return executeScript<number>({
      code: MarketplaceScripts.getUnRefundPaymentsCount,
      args: [],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getOffer(
    offerId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return executeScript<any>({
      code: MarketplaceScripts.getOffer,
      args: [offerId],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async createOffer(
    account: AuthAccount,
    nftId: number,
    offerDuration: number,
    offerPrice: number,
    offerStartTime?: number,
    royaltyPercent?: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.createOffer, options?.replaceMap),
      args: [nftId, toUFix64(offerDuration), toUFix64(offerPrice), toUFix64(royaltyPercent), toUFix64(offerStartTime)],
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async acceptOffer(
    account: AuthAccount,
    offerId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.acceptOffer, options?.replaceMap),
      args: [offerId],
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async removeOffer(
    account: AuthAccount,
    offerId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.removeOffer, options?.replaceMap),
      args: [offerId],
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async publicRemoveEndedOffer(
    account: AuthAccount,
    offerId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.publicRemoveEndedOffer, options?.replaceMap),
      args: [offerId],
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }
}

export class MelosMarketplaceAdminSDK extends BaseSDK {
  debug = false;

  adminHandle(
    account: AuthAccount,
    options?: {
      imports?: string;
      handles?: string;
      addressMap?: Record<string, string>;
      replaceMap?: Record<string, string>;
      limit?: number;
    }
  ) {
    let code = MarketplaceTransactionsTemplates.adminHandles;
    code = code.replace(new RegExp(`%ADMIN_IMPORTS%`, 'g'), options?.imports ?? '');
    code = code.replace(new RegExp(`%ADMIN_HANDLES%`, 'g'), options?.handles ?? '');
    code = this.code(code, options?.replaceMap);

    if (this.debug) {
      console.log(code);
    }

    return sendTransaction({
      code,
      args: [],
      payer: account.auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  resolvePaymentTokens(cdcFunc: string, paymentTokens: [{tokenName: string; tokenAddress: FlowAddress}]) {
    let imports = '';
    let tokens = '';
    for (const token of paymentTokens) {
      imports += `import ${token.tokenName} from ${token.tokenAddress}`;
      tokens += `${tokens !== '' ? ',' : ''}Type<@${token.tokenName}.Vault>()`;
    }
    const handles = `${cdcFunc}(${tokens})`;
    return {imports, handles};
  }

  async addAllowedPaymentTokens(
    account: AuthAccount,
    paymentTokens: [{tokenName: string; tokenAddress: FlowAddress}],
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(account, {
      ...options,
      ...this.resolvePaymentTokens('self.admin.addAllowedPaymentTokens', paymentTokens),
    });
  }

  async removeAllowedPaymentTokens(
    account: AuthAccount,
    paymentTokens: [{tokenName: string; tokenAddress: FlowAddress}],
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(account, {
      ...options,
      ...this.resolvePaymentTokens('self.admin.removeAllowedPaymentTokens', paymentTokens),
    });
  }

  async setAllowedPaymentTokens(
    account: AuthAccount,
    paymentTokens: [{tokenName: string; tokenAddress: FlowAddress}],
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(account, {
      ...options,
      ...this.resolvePaymentTokens('self.admin.setAllowedPaymentTokens', paymentTokens),
    });
  }

  async setMaxAuctionDuration(
    account: AuthAccount,
    newDuration: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(account, {...options, handles: `self.admin.setMaxAuctionDuration(${newDuration})`});
  }

  async setMinimumListingDuration(
    account: AuthAccount,
    newDuration: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(account, {...options, handles: `self.admin.setMinimumListingDuration(${newDuration})`});
  }

  async removeTokenFeeConfig(
    account: AuthAccount,
    paymentTokens: {tokenName: string; tokenAddress: FlowAddress},
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(account, {
      ...options,
      ...this.resolvePaymentTokens('self.admin.removeTokenFeeConfig', [paymentTokens]),
    });
  }

  async setTokenFeeConfig(
    account: AuthAccount,
    tokenName: string,
    tokenAddress: string,
    txFeeReceiver: FlowAddress,
    txFeePercent: UFix64,
    royaltyReceiver: FlowAddress,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    const imports = `import ${tokenName} from ${tokenAddress}`;
    const handles = `self.admin.setTokenFeeConfig(
      tokenType: Type<@${tokenName}.Vault>(), 
      config: MelosMarketplace.FungibleTokenFeeConfig(txFeeReceiver: ${txFeeReceiver}, txFeePercent: ${txFeePercent}, royaltyReceiver: ${royaltyReceiver})
    )`;

    return this.adminHandle(account, {
      ...options,
      imports,
      handles,
    });
  }
}
