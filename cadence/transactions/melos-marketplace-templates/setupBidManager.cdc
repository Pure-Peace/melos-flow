import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction {
  prepare(account: AuthAccount) {
    let PUBLIC_PATH = MelosMarketplace.BidManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.BidManagerStoragePath

    if account.borrow<&MelosMarketplace.BidManager>(from: STORAGE_PATH) == nil {
      let bidManager <- MelosMarketplace.createBidManager()
      account.save(<- bidManager, to: STORAGE_PATH)
      account.link<&{MelosMarketplace.BidManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
    }
  }
}
