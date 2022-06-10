import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64): Bool {
  let listing =  MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
  return listing.isListingEnded()
}
