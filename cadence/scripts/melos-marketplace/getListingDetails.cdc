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
