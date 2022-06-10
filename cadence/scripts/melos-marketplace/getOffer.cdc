import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(offerId: UInt64): &MelosMarketplace.Offer? {
  return MelosMarketplace.getOffer(offerId)
}
