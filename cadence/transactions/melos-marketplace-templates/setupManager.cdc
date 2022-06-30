import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


transaction() {
  prepare(account: AuthAccount) {
    let PUBLIC_PATH = MelosMarketplace.MarketplaceManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.MarketplaceManagerStoragePath

      let manager <- MelosMarketplace.createMarketplaceManager()
      account.save(<- manager, to: STORAGE_PATH)
      account.link<&{MelosMarketplace.MarketplaceManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
  }
}
