import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(listingId: UInt64): UFix64? {
  return MelosMarketplace.getListing(listingId)?.getPrice()
}
