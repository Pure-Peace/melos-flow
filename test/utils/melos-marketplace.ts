import {sendTransaction, executeScript} from 'flow-cadut';
import {getAuthAccount, scriptCode, txCode} from './helpers';

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
  listingConfig: Common | OpenBid | DutchAuction | EnglishAuction
) => {
  const {auth} = await getAuthAccount(seller);

  return sendTransaction({
    code: txCode('nft-storefront/create_listing'),
    args: [nftId, Number(listingType), listingConfig],
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
    code: txCode('nft-storefront/purchase_listing'),
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
    code: txCode('nft-storefront/remove_listing'),
    args: [itemId],
    payer: auth,
    addressMap,
    limit,
  });
};

/**
 * Returns the number of items for sale in a given account's storefront.
 * @param {string} account - account address
 * */
export const getListingCount = async (account: string) => {
  return executeScript({code: scriptCode('nft-storefront/get_listings_length'), args: [account], addressMap, limit});
};
