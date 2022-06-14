import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  offerId: UInt64
) {
  prepare(account: AuthAccount) {

  }

  execute {
    let result = MelosMarketplace.removeOffer(offerId: offerId)
  }
}