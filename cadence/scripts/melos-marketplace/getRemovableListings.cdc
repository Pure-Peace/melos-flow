import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(): [UInt64] {
  let results: [UInt64] = []
  let listingIds = MelosMarketplace.getListingIds()
  for listingId in listingIds {
    if MelosMarketplace.isListingRemovable(listingId: listingId) {
      results.append(listingId)
    }
  }
  return results
}
