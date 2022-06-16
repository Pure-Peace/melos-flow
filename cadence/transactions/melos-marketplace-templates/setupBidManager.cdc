import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction {
  prepare(account: AuthAccount) {
    let PUBLIC_PATH = MelosMarketplace.MarketplaceManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.MarketplaceManagerStoragePath

    if account.borrow<&MelosMarketplace.MarketplaceManager>(from: STORAGE_PATH) == nil {
      let manager <- MelosMarketplace.createMarketplaceManager()
      account.save(<- manager, to: STORAGE_PATH)
      account.link<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
    }
  }
}
