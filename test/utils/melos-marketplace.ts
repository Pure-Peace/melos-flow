import {sendTransaction, executeScript} from 'flow-cadut';
import {getAuthAccount, scriptCode, toUFix64, txCode} from './helpers';

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
export const setupListingManager = async (account: string) => {
  const {auth} = await getAuthAccount(account);

  return sendTransaction({code: txCode('melos-marketplace/setupListingManager'), payer: auth, addressMap, limit});
};

export const createListing = async (
  seller: string,
  nftId: number,
  listingType: ListingType,
  cfg: Common | OpenBid | DutchAuction | EnglishAuction
) => {
  const {auth} = await getAuthAccount(seller);

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
    payer: auth,
    addressMap,
    limit,
  });
};

/**
 * Buys item with id equal to **item** id for **price** from **seller**.
 * @param {string} buyer - buyer account address
 * @param {UInt64} resourceId - resource uuid of item to sell
 * @param {string} seller - seller account address
 * */
export const purchaseListing = async (buyer: string, resourceId: number, seller: string) => {
  const {auth} = await getAuthAccount(buyer);

  return sendTransaction({
    code: txCode('melos-marketplace/purchaseListing'),
    args: [resourceId, seller],
    payer: auth,
    addressMap,
    limit,
  });
};

/**
 * Removes item with id equal to **item** from sale.
 * @param {string} owner - owner address
 * @param {UInt64} itemId - id of item to remove
 * */
export const removeListing = async (owner: string, itemId: number) => {
  const {auth} = await getAuthAccount(owner);

  return sendTransaction({
    code: txCode('melos-marketplace/removeListing'),
    args: [itemId],
    payer: auth,
    addressMap,
    limit,
  });
};

export const getAccountListingCount = async (account: string) => {
  return executeScript({
    code: scriptCode('melos-marketplace/getAccountListingCount'),
    args: [account],
    addressMap,
    limit,
  });
};

export const setAllowedPaymentTokens = async (account: string) => {
  const {auth} = await getAuthAccount(account);

  return sendTransaction({
    code: txCode('melos-marketplace/adminSetAllowedPaymentTokens'),
    args: [],
    payer: auth,
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
