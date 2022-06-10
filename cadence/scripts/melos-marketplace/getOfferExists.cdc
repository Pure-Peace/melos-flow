import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(offerId: UInt64): Bool {
  return MelosMarketplace.isOfferExists(offerId)
}
