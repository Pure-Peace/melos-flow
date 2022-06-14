export default {
  getAccountListingCount: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(address: Address): Int {
    let account = getAccount(address)

    let listingManager = account.getCapability(MelosMarketplace.ListingManagerPublicPath)
        .borrow<&{MelosMarketplace.ListingManagerPublic}>()
        ?? panic("Could not borrow capability from public ListingManager")
    
    return listingManager.getlistings().length
}

`,
  getAccountListings: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(address: Address): {UInt64: UInt64} {
    let account = getAccount(address)

    let listingManager = account.getCapability(MelosMarketplace.ListingManagerPublicPath)
        .borrow<&{MelosMarketplace.ListingManagerPublic}>()
        ?? panic("Could not borrow capability from public ListingManager")
    
    return listingManager.getlistings()
}

`,
  getAllowedPaymentTokens: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(): [Type] {
  return MelosMarketplace.getAllowedPaymentTokens()
}

`,
  getContractIdentifier: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(): String {
  return Type<MelosMarketplace>().identifier
}

`,
  getEnglishAuctionParticipants: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(listingId: UInt64): {Address: UInt64}? {
  if let listing = MelosMarketplace.getListing(listingId) {
    return listing.getEnglishAuctionParticipants()
  }
  return nil
}

`,
  getFeeConfigs: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(): {String: MelosMarketplace.FungibleTokenFeeConfig} {    
    return MelosMarketplace.getFeeConfigs()
}

`,
  getListingCount: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(): Int {    
    return MelosMarketplace.getListingCount()
}

`,
  getListingDetails: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub struct Listing {
  pub let details: MelosMarketplace.ListingDetails
  pub let price: UFix64
  pub let nextBidMiniumPrice: UFix64?
  pub let isNFTAvaliable: Bool
  pub let isListingStarted: Bool
  pub let isListingEnded: Bool
  pub let isPurchased: Bool

  init(
    _ listing: &{MelosMarketplace.ListingPublic}
  ) {
    self.details = listing.getDetails()
    self.price = listing.getPrice()
    if listing.isListingType(MelosMarketplace.ListingType.EnglishAuction) {
      self.nextBidMiniumPrice = (self.details.listingConfig as! MelosMarketplace.EnglishAuction).getNextBidMinimumPrice()
    } else {
      self.nextBidMiniumPrice = nil
    }

    self.isNFTAvaliable = listing.isNFTAvaliable()
    self.isListingStarted = listing.isListingStarted()
    self.isListingEnded = listing.isListingEnded()
    self.isPurchased = listing.isPurchased()
  }
}

pub fun main(listingId: UInt64): Listing? {
  if let listing = MelosMarketplace.getListing(listingId) {
    return Listing(listing)
  }
  return nil
}

`,
  getListingEnded: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64): Bool {
  let listing =  MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
  return listing.isListingEnded()
}

`,
  getListingExists: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64): Bool {
  return MelosMarketplace.getListing(listingId) != nil ? true : false
}

`,
  getListingIsType: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64, listingType: UInt8): Bool {
  let listing =  MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
  return listing.isListingType(MelosMarketplace.ListingType(rawValue: listingType)!)
}

`,
  getListingNextBidMinimumPrice: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(listingId: UInt64): UFix64 {
  let listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
  if !listing.isListingType(MelosMarketplace.ListingType.EnglishAuction) {
    panic("Listing type is not english auction")
  }
  return (listing.config() as! MelosMarketplace.EnglishAuction).getNextBidMinimumPrice()
}

`,
  getListingPrice: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64): UFix64? {
  return MelosMarketplace.getListing(listingId)?.getPrice()
}

`,
  getListingPurachased: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64): Bool {
  return MelosMarketplace.getListing(listingId)!.isPurchased()
}

`,
  getListingSortedBids: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(listingId: UInt64): [&AnyResource{MelosMarketplace.BidPublic}]? {
  if let listing = MelosMarketplace.getListing(listingId) {
    return listing.getSortedBids()
  }
  return nil
}

`,
  getListingTopBid: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(listingId: UInt64): &{MelosMarketplace.BidPublic}? {
  let listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
  if !listing.isListingType(MelosMarketplace.ListingType.EnglishAuction) {
    panic("Listing type is not english auction")
  }
  if let bidId = (listing.config() as! MelosMarketplace.EnglishAuction).topBidId {
    return MelosMarketplace.getBid(listingId: listingId, bidId: bidId)
  }
  return nil
}

`,
  getListingType: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64): UInt8 {
  let listing =  MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
  return listing.getListingType().rawValue
}

`,
  getOffer: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(offerId: UInt64): &MelosMarketplace.Offer? {
  return MelosMarketplace.getOffer(offerId)
}

`,
  getOfferExists: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(offerId: UInt64): Bool {
  return MelosMarketplace.isOfferExists(offerId)
}

`,
  getUnRefundPaymentsCount: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(): Int {
  return MelosMarketplace.getUnRefundPaymentsCount()
}

`,
};
