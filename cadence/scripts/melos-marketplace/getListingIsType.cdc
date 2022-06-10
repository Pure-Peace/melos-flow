import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64, listingType: UInt8): Bool {
  let listing =  MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
  return listing.isListingType(MelosMarketplace.ListingType(rawValue: listingType)!)
}
