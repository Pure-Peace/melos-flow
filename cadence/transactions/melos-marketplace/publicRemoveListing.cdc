import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingId: UInt64
) {
  execute {
    let result = MelosMarketplace.removeListing(listingId: listingId)
  }
}