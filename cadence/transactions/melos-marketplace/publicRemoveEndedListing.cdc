import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingIds: [UInt64]
) {
  prepare(account: AuthAccount) {

  }

  execute {
    for listingId in listingIds {
      MelosMarketplace.removeListing(listingId: listingId)
    }
  }
}