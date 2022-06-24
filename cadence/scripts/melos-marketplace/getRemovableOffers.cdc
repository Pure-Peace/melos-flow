import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(): [UInt64] {
  let results: [UInt64] = []
  let offerIds = MelosMarketplace.getOfferIds()
  for offerId in offerIds {
    if MelosMarketplace.isOfferRemovable(offerId: offerId) {
      results.append(offerId)
    }
  }
  return results
}
