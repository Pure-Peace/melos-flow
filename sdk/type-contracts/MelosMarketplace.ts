import {FlowAddress, UFix64} from '../../sdk/types';
import {FlowType} from 'typescript';

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

export type TxFeeCuttedEvent = {
  listingId: number;
  txFee?: UFix64;
  royalty?: UFix64;
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

export type BidCreatedEvent = {
  listingId: number;
  bidId: number;
  bidder: FlowAddress;
  offerPrice: UFix64;
};

export type BidRemovedEvent = {
  listingId: number;
  bidId: number;
};

export type BidListingCompletedEvent = {
  listingId: number;
  winBid: number;
  bidder: FlowAddress;
  price: UFix64;
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
  nextBidMiniumPrice?: UFix64;
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

export interface CommonParams extends ListingConfig {
  price: number;
}

export interface OpenBidParams extends ListingConfig {
  minimumPrice: number;
}

export interface DutchAuctionParams extends ListingConfig {
  startingPrice: number;
  reservePrice: number;
  priceCutInterval: number;
  listingDuration: number;
}

export interface EnglishAuctionParams extends ListingConfig {
  reservePrice: number;
  minimumBidPercentage: number;
  basePrice: number;
  listingDuration: number;
}

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
