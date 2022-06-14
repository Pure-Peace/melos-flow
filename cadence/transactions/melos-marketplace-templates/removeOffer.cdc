import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  offerId: UInt64
) {
  let offerManager: &MelosMarketplace.OfferManager
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.OfferManagerStoragePath

    self.offerManager = account.borrow<&MelosMarketplace.OfferManager>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow OfferManager")
  }

  execute {
    self.offerManager.removeOffer(offerId: offerId)
  }
}