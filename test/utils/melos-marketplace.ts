import {sendTransaction, executeScript} from 'flow-cadut';
import {toFlowAddress} from 'sdk/common';
import {AuthAccount, getAuthAccountByAddress, scriptCode, toUFix64, txCode} from './helpers';

const limit = 999;

const addressMap = {
  NonFungibleToken: '0xf8d6e0586b0a20c7',
  MelosNFT: '0xf8d6e0586b0a20c7',
  MelosMarketplace: '0xf8d6e0586b0a20c7',
};

export enum ListingType {
  Common,
  OpenBid,
  DutchAuction,
  EnglishAuction,
}

export type MarketplaceEvents =
  | 'MelosSettlementInitialized'
  | 'ListingManagerCreated'
  | 'ListingManagerDestroyed'
  | 'FungibleTokenFeeUpdated'
  | 'TxFeeCutted'
  | 'FungibleTokenFeeRemoved'
  | 'MinimumListingDurationChanged'
  | 'MaxAuctionDurationChanged'
  | 'AllowedPaymentTokensChanged'
  | 'BidCreated'
  | 'BidRemoved'
  | 'BidListingCompleted'
  | 'ListingCreated'
  | 'ListingRemoved'
  | 'FixedPricesListingCompleted';

export type MelosNFTEvents = 'Minted' | 'Withdraw' | 'Deposit' | 'MetadataBaseURIChanged';

export type UFix64 = string;

export type FlowType = string;

export type FlowAddress = string;

export type ListingCreatedEvent = {
  listingId: number;
  listingType: number;
  seller: FlowAddress;
  nftId: number;
  nftType: FlowType;
  nftResourceUUID: number;
  paymentToken: FlowType;
  listingStartTime: UFix64;
  listingEndTime?: UFix64;
};

export type MelosNFTMintedEvent = {
  id: number;
  recipient: string;
};

export type FungibleTokensWithdrawnEvent = {
  amount: UFix64;
  from: FlowAddress;
};

export type FungibleTokensDepositedEvent = {
  amount: UFix64;
  to: FlowAddress;
};

export type TxFeeCuttedEvent = {
  listingId: number;
  txFee?: UFix64;
  royalty?: UFix64;
};

export type MelosNFTWithdrawEvent = {
  id: number;
  from: FlowAddress;
};

export type MelosNFTDepositEvent = {
  id: number;
  to: FlowAddress;
};

export type FixedPricesListingCompletedEvent = {
  listingId: number;
  payment: UFix64;
  buyer: FlowAddress;
};

export type ListingRemovedEvent = {
  listingId: number;
  purchased: boolean;
};

export type ListingDetailsQuery = {
  details: {
    listingType: number;
    listingManagerId: number;
    nftType: string;
    nftId: number;
    nftResourceUUID: number;
    paymentToken: string;
    listingConfig: {
      listingStartTime: UFix64;
      listingEndTime: UFix64;
      royaltyPercent: UFix64;
      startingPrice: UFix64;
      reservePrice: UFix64;
      priceCutInterval: UFix64;
    };
    receiver: {
      path: any;
      address: FlowAddress;
      borrowType: string;
    };
    isPurchased: boolean;
  };
  price: UFix64;
  isNFTAvaliable: boolean;
  isListingStarted: boolean;
  isListingEnded: boolean;
  isPurchased: boolean;
};

export interface ListingConfig {
  listingStartTime?: number;
  listingDuration?: number;
  royaltyPercent?: number;
}

export interface Common extends ListingConfig {
  price: number;
}

export interface OpenBid extends ListingConfig {
  minimumPrice: number;
}

export interface DutchAuction extends ListingConfig {
  startingPrice: number;
  reservePrice: number;
  priceCutInterval: number;
  listingDuration: number;
}

export interface EnglishAuction extends ListingConfig {
  reservePrice: number;
  minimumBidPercentage: number;

  basePrice: number;
  currentPrice: number;
  topBidId?: number;
  listingDuration: number;
}

/**
 * Sets up MelosMarketplace.ListingManager on account and exposes public capability.
 * @param {string} account - account address
 * @throws Will throw an error if transaction is reverted.
 * */
export async function setupListingManager(account: AuthAccount) {
  return sendTransaction({
    code: txCode('melos-marketplace/setupListingManager'),
    payer: account.auth,
    addressMap,
    limit,
  });
}

export async function createListing(
  owner: AuthAccount,
  nftId: number,
  listingType: ListingType,
  cfg: Common | OpenBid | DutchAuction | EnglishAuction
) {
  let args: unknown[] = [
    nftId,
    toUFix64(cfg.listingStartTime),
    toUFix64(cfg.listingDuration),
    toUFix64(cfg.royaltyPercent),
  ];
  switch (listingType) {
    case ListingType.Common:
      cfg = cfg as Common;
      args = args.concat([toUFix64(cfg.price)]);
      break;
    case ListingType.OpenBid:
      cfg = cfg as OpenBid;
      args = args.concat([toUFix64(cfg.minimumPrice)]);
      break;
    case ListingType.DutchAuction:
      cfg = cfg as DutchAuction;
      args = args.concat([toUFix64(cfg.startingPrice), toUFix64(cfg.reservePrice), toUFix64(cfg.priceCutInterval)]);
      break;
    case ListingType.EnglishAuction:
      cfg = cfg as EnglishAuction;
      args = args.concat([toUFix64(cfg.reservePrice), toUFix64(cfg.minimumBidPercentage), toUFix64(cfg.basePrice)]);
      break;
  }

  return sendTransaction({
    code: txCode(`melos-marketplace/listing${ListingType[listingType]}`),
    args,
    payer: owner.auth,
    addressMap,
    limit,
  });
}

export async function removeListing(listingOwner: AuthAccount, listingId: number) {
  return sendTransaction({
    code: txCode('melos-marketplace/removeListing'),
    args: [listingId],
    payer: listingOwner.auth,
    addressMap,
    limit,
  });
}

export async function publicRemoveListing(executor: AuthAccount, listingId: number) {
  return sendTransaction({
    code: txCode('melos-marketplace/publicRemoveListing'),
    args: [listingId],
    payer: executor.auth,
    addressMap,
    limit,
  });
}

export async function purchaseListing(account: AuthAccount, listingId: number) {
  return sendTransaction({
    code: txCode('melos-marketplace/purchaseListing'),
    args: [listingId],
    payer: account.auth,
    addressMap,
    limit,
  });
}

export async function getAccountListingCount(address: string) {
  return executeScript<number>({
    code: scriptCode('melos-marketplace/getAccountListingCount'),
    args: [address],
    addressMap,
    limit,
  });
}

export async function setAllowedPaymentTokens(admin: AuthAccount) {
  return sendTransaction({
    code: txCode('melos-marketplace/adminSetAllowedPaymentTokens'),
    args: [],
    payer: admin.auth,
    addressMap,
    limit,
  });
}

export async function getAllowedPaymentTokens() {
  return executeScript<string[]>({
    code: scriptCode('melos-marketplace/getAllowedPaymentTokens'),
    args: [],
    addressMap,
    limit,
  });
}

export async function getContractIdentifier() {
  return executeScript<string>({
    code: scriptCode('melos-marketplace/getContractIdentifier'),
    args: [],
    addressMap,
    limit,
  });
}

export async function getListingDetails(listingId: number) {
  return executeScript<ListingDetailsQuery>({
    code: scriptCode('melos-marketplace/getListingDetails'),
    args: [listingId],
    addressMap,
    limit,
  });
}

export async function getFlowBalance(address: string) {
  return executeScript<UFix64>({
    code: scriptCode('getFlowBalance'),
    args: [address],
    addressMap,
    limit,
  });
}

export async function getBlockTime() {
  return executeScript<UFix64>({
    code: scriptCode('getBlockTime'),
    args: [],
    addressMap,
    limit,
  });
}

export async function getListingExists(listingId: number) {
  return executeScript<boolean>({
    code: scriptCode('melos-marketplace/getListingExists'),
    args: [listingId],
    addressMap,
    limit,
  });
}

export async function getListingPurachased(listingId: number) {
  return executeScript<boolean>({
    code: scriptCode('melos-marketplace/getListingPurachased'),
    args: [listingId],
    addressMap,
    limit,
  });
}

export async function getListingPrice(listingId: number) {
  return executeScript<string>({
    code: scriptCode('melos-marketplace/getListingPrice'),
    args: [listingId],
    addressMap,
    limit,
  });
}
