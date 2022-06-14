import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingId: UInt64
) {
  prepare(account: AuthAccount) {

  }

  execute {
    let result = MelosMarketplace.removeListing(listingId: listingId)
  }
}