import {
  ListingType,
  CommonParams,
  OpenBidParams,
  DutchAuctionParams,
  EnglishAuctionParams,
  ListingDetailsQuery,
} from '../type-contracts/melosMarketplace';

import MarketplaceScripts from '../../sdk-code/scripts/melos-marketplace';
import MarketplaceTransactionsTemplates from '../../sdk-code/transactions/melos-marketplace-templates';

import {toFlowAddress, toUFix64} from '../common';
import {FlowAddress, FlowAuthorize, UFix64} from '../types';
import {BaseSDK} from './base';
import {executeScript, sendTransaction} from '../transaction';

export class MelosMarketplaceSDK extends BaseSDK {
  /**
   * Sets up MelosMarketplace.MarketplaceManager on auth and exposes public capability.
   * @param {string} auth - auth address
   * @throws Will throw an error if transaction is reverted.
   * */
  async setupListingManager(
    auth: FlowAuthorize,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.setupListingManager, options?.replaceMap),
      payer: auth,
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
    auth: FlowAuthorize,
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
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async removeListing(
    auth: FlowAuthorize,
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.removeListing, options?.replaceMap),
      args: [listingId],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async publicRemoveEndedListing(
    auth: FlowAuthorize,
    listingIds: number[],
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.publicRemoveEndedListing, options?.replaceMap),
      args: [listingIds],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async purchaseListing(
    auth: FlowAuthorize,
    listingId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.purchaseListing, options?.replaceMap),
      args: [listingId],
      payer: auth,
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
    auth: FlowAuthorize,
    listingId: number,
    price: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.createBid, options?.replaceMap),
      args: [listingId, toUFix64(price)],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async removeBid(
    auth: FlowAuthorize,
    listingId: number,
    bidId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.removeBid, options?.replaceMap),
      args: [listingId, bidId],
      payer: auth,
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
    auth: FlowAuthorize,
    listingId: number,
    bidId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.acceptOpenBid, options?.replaceMap),
      args: [listingId, bidId],
      payer: auth,
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
    auth: FlowAuthorize,
    listingIds: number[],
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.publicCompleteEnglishAuction, options?.replaceMap),
      args: [listingIds],
      payer: auth,
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
    auth: FlowAuthorize,
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
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async acceptOffer(
    auth: FlowAuthorize,
    offerId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.acceptOffer, options?.replaceMap),
      args: [offerId],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async removeOffer(
    auth: FlowAuthorize,
    offerId: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.removeOffer, options?.replaceMap),
      args: [offerId],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async publicRemoveEndedOffer(
    auth: FlowAuthorize,
    offerIds: number[],
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.publicRemoveEndedOffer, options?.replaceMap),
      args: [offerIds],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async claimUnRefundPayment(
    auth: FlowAuthorize,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return sendTransaction({
      code: this.code(MarketplaceTransactionsTemplates.claimUnRefundPayment, options?.replaceMap),
      args: [],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getRemovableListings(options?: {
    addressMap?: Record<string, string>;
    replaceMap?: Record<string, string>;
    limit?: number;
  }) {
    return executeScript<number[]>({
      code: MarketplaceScripts.getRemovableListings,
      args: [],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  async getRemovableOrders(options?: {
    addressMap?: Record<string, string>;
    replaceMap?: Record<string, string>;
    limit?: number;
  }) {
    return executeScript<number[]>({
      code: MarketplaceScripts.getRemovableOrders,
      args: [],
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }
}

export class MelosMarketplaceAdminSDK extends BaseSDK {
  debug = false;

  adminHandle(
    auth: FlowAuthorize,
    options?: {
      imports?: string;
      selfVars?: {define: string; init: string}[];
      handles?: string;
      addressMap?: Record<string, string>;
      replaceMap?: Record<string, string>;
      limit?: number;
    }
  ) {
    let code = MarketplaceTransactionsTemplates.adminHandles;
    code = code.replace(new RegExp(`%ADMIN_IMPORTS%`, 'g'), options?.imports ?? '');
    code = code.replace(new RegExp(`%ADMIN_HANDLES%`, 'g'), options?.handles ?? '');

    let selfVarsDefine = '';
    let selfVarsInit = '';
    if (options?.selfVars) {
      for (const v of options.selfVars) {
        selfVarsDefine += v.define + '\n';
        selfVarsInit += v.init + '\n';
      }
    }
    code = code.replace(new RegExp(`%SELF_VARS%`, 'g'), selfVarsDefine);
    code = code.replace(new RegExp(`%SELF_VARS_INIT%`, 'g'), selfVarsInit);
    code = this.code(code, options?.replaceMap);

    if (this.debug) {
      console.log('AdminSDK DEBUG: ', code);
    }

    return sendTransaction({
      code,
      args: [],
      payer: auth,
      addressMap: options?.addressMap ?? this.addressMap,
      limit: options?.limit ?? this.limit,
    });
  }

  resolvePaymentTokens(
    cdcFunc: string,
    isList: boolean,
    paymentTokens: {tokenName: string; tokenAddress: FlowAddress}[]
  ) {
    let imports = '';
    let tokens = '';
    for (const token of paymentTokens) {
      imports += `import ${token.tokenName} from ${token.tokenAddress}\n`;
      tokens += `${tokens !== '' ? ',' : ''}Type<@${token.tokenName}.Vault>()`;
    }
    const handles = `${cdcFunc}(${isList ? '[' + tokens + ']' : tokens})`;
    return {imports, handles};
  }

  async addAllowedPaymentTokens(
    auth: FlowAuthorize,
    paymentTokens: {tokenName: string; tokenAddress: FlowAddress}[],
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(auth, {
      ...options,
      ...this.resolvePaymentTokens('self.admin.addAllowedPaymentTokens', true, paymentTokens),
    });
  }

  async removeAllowedPaymentTokens(
    auth: FlowAuthorize,
    paymentTokens: {tokenName: string; tokenAddress: FlowAddress}[],
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(auth, {
      ...options,
      ...this.resolvePaymentTokens('self.admin.removeAllowedPaymentTokens', true, paymentTokens),
    });
  }

  async setAllowedPaymentTokens(
    auth: FlowAuthorize,
    paymentTokens: {tokenName: string; tokenAddress: FlowAddress}[],
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(auth, {
      ...options,
      ...this.resolvePaymentTokens('self.admin.setAllowedPaymentTokens', true, paymentTokens),
    });
  }

  async setMaxAuctionDuration(
    auth: FlowAuthorize,
    newDuration: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(auth, {...options, handles: `self.admin.setMaxAuctionDuration(${newDuration})`});
  }

  async setMinimumListingDuration(
    auth: FlowAuthorize,
    newDuration: number,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(auth, {...options, handles: `self.admin.setMinimumListingDuration(${newDuration})`});
  }

  async removeTokenFeeConfig(
    auth: FlowAuthorize,
    paymentTokens: {tokenName: string; tokenAddress: FlowAddress},
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    return this.adminHandle(auth, {
      ...options,
      ...this.resolvePaymentTokens('self.admin.removeTokenFeeConfig', false, [paymentTokens]),
    });
  }

  async setTokenFeeConfig(
    auth: FlowAuthorize,
    tokenName: string,
    tokenAddress: string,
    txFeeReceiver: FlowAddress,
    txFeePercent: UFix64,
    royaltyReceiver: FlowAddress,
    options?: {addressMap?: Record<string, string>; replaceMap?: Record<string, string>; limit?: number}
  ) {
    const imports = `import ${tokenName} from ${tokenAddress}\nimport FungibleToken from "../../contracts/core/FungibleToken.cdc"\n`;
    const handles = `self.admin.setTokenFeeConfig(
      tokenType: Type<@${tokenName}.Vault>(), 
      config: MelosMarketplace.FungibleTokenFeeConfig(
        txFeeReceiver: getAccount(${toFlowAddress(
          txFeeReceiver
        )}).getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%), 
        txFeePercent: ${txFeePercent}, 
        royaltyReceiver: getAccount(${toFlowAddress(
          royaltyReceiver
        )}).getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)
      )
    )`;

    return this.adminHandle(auth, {
      ...options,
      imports,
      handles,
    });
  }
}
