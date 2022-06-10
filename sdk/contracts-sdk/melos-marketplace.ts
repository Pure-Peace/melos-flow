import {sendTransaction, executeScript} from 'flow-cadut';
import {
  ListingType,
  CommonParams,
  OpenBidParams,
  DutchAuctionParams,
  EnglishAuctionParams,
  ListingDetailsQuery,
} from '../../sdk/type-contracts/MelosMarketplace';
import {scriptCode, toUFix64, txCode} from '../common';
import {AuthAccount, UFix64} from '../types';
import {addressMap, limit} from './config';

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
  cfg: CommonParams | OpenBidParams | DutchAuctionParams | EnglishAuctionParams
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
  return executeScript<UFix64>({
    code: scriptCode('melos-marketplace/getListingPrice'),
    args: [listingId],
    addressMap,
    limit,
  });
}

export async function createBid(buyer: AuthAccount, listingId: number, price: number) {
  return sendTransaction({
    code: txCode('melos-marketplace/createBid'),
    args: [listingId, toUFix64(price)],
    payer: buyer.auth,
    addressMap,
    limit,
  });
}

export async function removeBid(bidder: AuthAccount, listingId: number, bidId: number) {
  return sendTransaction({
    code: txCode('melos-marketplace/removeBid'),
    args: [listingId, bidId],
    payer: bidder.auth,
    addressMap,
    limit,
  });
}

export async function getListingSortedBids(listingId: number) {
  return executeScript<any[]>({
    code: scriptCode('melos-marketplace/getListingSortedBids'),
    args: [listingId],
    addressMap,
    limit,
  });
}

export async function acceptOpenBid(seller: AuthAccount, listingId: number, bidId: number) {
  return sendTransaction({
    code: txCode('melos-marketplace/acceptOpenBid'),
    args: [listingId, bidId],
    payer: seller.auth,
    addressMap,
    limit,
  });
}

export async function getListingNextBidMinimumPrice(listingId: number) {
  return executeScript<UFix64>({
    code: scriptCode('melos-marketplace/getListingNextBidMinimumPrice'),
    args: [listingId],
    addressMap,
    limit,
  });
}

export async function getListingTopBid(listingId: number) {
  return executeScript<any>({
    code: scriptCode('melos-marketplace/getListingTopBid'),
    args: [listingId],
    addressMap,
    limit,
  });
}

export async function publicCompleteListing(account: AuthAccount, listingId: number) {
  return sendTransaction({
    code: txCode('melos-marketplace/publicCompleteListing'),
    args: [listingId],
    payer: account.auth,
    addressMap,
    limit,
  });
}

export async function getListingEnded(listingId: number) {
  return executeScript<boolean>({
    code: scriptCode('melos-marketplace/getListingEnded'),
    args: [listingId],
    addressMap,
    limit,
  });
}

export async function getListingIsType(listingId: number, listingType: ListingType) {
  return executeScript<boolean>({
    code: scriptCode('melos-marketplace/getListingIsType'),
    args: [listingId, Number(listingType)],
    addressMap,
    limit,
  });
}
