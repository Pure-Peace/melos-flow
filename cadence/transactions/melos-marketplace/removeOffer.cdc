import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  offerId: UInt64
) {
  let manager: &MelosMarketplace.MarketplaceManager
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.MarketplaceManagerStoragePath

    self.manager = account.borrow<&MelosMarketplace.MarketplaceManager>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow MarketplaceManager")
  }

  execute {
    self.manager.removeOffer(offerId: offerId)
  }
}