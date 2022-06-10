import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(listingId: UInt64): [&AnyResource{MelosMarketplace.BidPublic}]? {
  if let listing = MelosMarketplace.getListing(listingId) {
    return listing.getSortedBids()
  }
  return nil
}
