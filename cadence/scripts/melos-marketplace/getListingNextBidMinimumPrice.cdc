import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(listingId: UInt64): UFix64 {
  let listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
  if !listing.isListingType(MelosMarketplace.ListingType.EnglishAuction) {
    panic("Listing type is not english auction")
  }
  return (listing.config() as! MelosMarketplace.EnglishAuction).getNextBidMinimumPrice()
}
