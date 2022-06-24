import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingIds: [UInt64]
) {
  prepare(account: AuthAccount) {

  }

  execute {
    for listingId in listingIds {
      let listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
      listing.completeEnglishAuction()
    }
  }
}