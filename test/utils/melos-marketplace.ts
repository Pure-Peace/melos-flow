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

export enum Events {
  ListingCreated,
}

export type ListingCreated = {
  listingType: number;
  seller: string;
  listingId: number;
  nftId: number;
  nftType: string;
  nftResourceUUID: number;
  paymentToken: string;
  listingStartTime: string;
  listingEndTime?: string;
};

export interface ListingConfig {
  listingStartTime: number;
  listingEndTime?: number;
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
}

export interface EnglishAuction extends ListingConfig {
  reservePrice: number;
  minimumBidPercentage: number;

  basePrice: number;
  currentPrice: number;
  topBidId?: number;
}

/**
 * Sets up MelosMarketplace.ListingManager on account and exposes public capability.
 * @param {string} account - account address
 * @throws Will throw an error if transaction is reverted.
 * */
export const setupListingManager = async (account: AuthAccount) => {
  return sendTransaction({
    code: txCode('melos-marketplace/setupListingManager'),
    payer: account.auth,
    addressMap,
    limit,
  });
};

export const createListing = async (
  owner: AuthAccount,
  nftId: number,
  listingType: ListingType,
  cfg: Common | OpenBid | DutchAuction | EnglishAuction
) => {
  let args: unknown[] = [nftId, toUFix64(cfg.listingStartTime), toUFix64(cfg.listingEndTime)];
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
};

export const removeListing = async (listingOwner: AuthAccount, listingId: number) => {
  return sendTransaction({
    code: txCode('melos-marketplace/removeListing'),
    args: [listingId],
    payer: listingOwner.auth,
    addressMap,
    limit,
  });
};

export const purchaseListing = async (account: AuthAccount, listingId: number) => {
  return sendTransaction({
    code: txCode('melos-marketplace/purchaseListing'),
    args: [listingId],
    payer: account.auth,
    addressMap,
    limit,
  });
};

export const getAccountListingCount = async (address: string) => {
  return executeScript({
    code: scriptCode('melos-marketplace/getAccountListingCount'),
    args: [address],
    addressMap,
    limit,
  });
};

export const setAllowedPaymentTokens = async (admin: AuthAccount) => {
  return sendTransaction({
    code: txCode('melos-marketplace/adminSetAllowedPaymentTokens'),
    args: [],
    payer: admin.auth,
    addressMap,
    limit,
  });
};

export const getAllowedPaymentTokens = async () => {
  return executeScript({
    code: scriptCode('melos-marketplace/getAllowedPaymentTokens'),
    args: [],
    addressMap,
    limit,
  });
};

export const getContractIdentifier = async () => {
  return executeScript({
    code: scriptCode('melos-marketplace/getContractIdentifier'),
    args: [],
    addressMap,
    limit,
  });
};

export const getListingDetails = async (listingId: number) => {
  return executeScript({
    code: scriptCode('melos-marketplace/getListingDetails'),
    args: [listingId],
    addressMap,
    limit,
  });
};

export const getFlowBalance = async (address: string) => {
  return executeScript({
    code: scriptCode('getFlowBalance'),
    args: [address],
    addressMap,
    limit,
  });
};
