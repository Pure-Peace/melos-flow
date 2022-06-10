import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64): UInt8 {
  let listing =  MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
  return listing.getListingType().rawValue
}
