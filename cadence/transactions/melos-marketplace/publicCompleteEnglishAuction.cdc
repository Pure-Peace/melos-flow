import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingId: UInt64
) {
  prepare(account: AuthAccount) {

  }

  execute {
    let listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
    listing.completeEnglishAuction()
  }
}