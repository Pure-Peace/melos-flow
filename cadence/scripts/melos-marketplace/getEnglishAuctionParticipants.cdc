import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(listingId: UInt64): {Address: UInt64}? {
  if let listing = MelosMarketplace.getListing(listingId) {
    return listing.getEnglishAuctionParticipants()
  }
  return nil
}
