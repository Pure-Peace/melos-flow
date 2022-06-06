import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub struct Listing {
  pub let listingType: MelosMarketplace.ListingType
  pub let details: MelosMarketplace.ListingDetails
  pub let price: UFix64
  pub let isNFTAvaliable: Bool
  pub let isListingStarted: Bool
  pub let isListingEnded: Bool
  pub let isPurchased: Bool
  pub let topBid: &{MelosMarketplace.BidPublic}?

  init(
    _ listing: &{MelosMarketplace.ListingPublic}
  ) {
    self.listingType = listing.getListingType()
    self.details = listing.getDetails()
    self.price = listing.getPrice()

    self.isNFTAvaliable = listing.isNFTAvaliable()
    self.isListingStarted = listing.isListingStarted()
    self.isListingEnded = listing.isListingEnded()
    self.isPurchased = listing.isPurchased()
    self.topBid = listing.getTopBidFromBids()
  }
}

pub fun main(listingId: UInt64): Listing? {
  if let listing = MelosMarketplace.getListing(listingId) {
    return Listing(listing)
  }
  return nil
}
