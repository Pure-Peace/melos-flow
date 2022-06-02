import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


transaction {
  prepare(account: AuthAccount) {
    let PUBLIC_PATH = MelosMarketplace.ListingManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.ListingManagerStoragePath

    if account.borrow<&MelosMarketplace.ListingManager>(from: STORAGE_PATH) == nil {
      let listingManager <- MelosMarketplace.createListingManager()
      account.save(<- listingManager, to: STORAGE_PATH)
      account.link<&{MelosMarketplace.ListingManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
    }
  }
}
