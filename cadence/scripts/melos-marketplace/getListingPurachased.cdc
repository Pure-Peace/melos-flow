import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64): Bool {
  return MelosMarketplace.getListing(listingId)!.isPurchased()
}
