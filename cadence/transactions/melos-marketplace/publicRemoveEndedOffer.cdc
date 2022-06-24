import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  offerIds: [UInt64]
) {
  prepare(account: AuthAccount) {

  }

  execute {
    for offerId in offerIds {
      MelosMarketplace.removeOffer(offerId: offerId)
    }
  }
}