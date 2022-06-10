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
