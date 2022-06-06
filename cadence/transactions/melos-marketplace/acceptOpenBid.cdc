import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingId: UInt64,
  bidId: UInt64
) {
  let listingManager: &MelosMarketplace.ListingManager
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.ListingManagerStoragePath

    self.listingManager = account.borrow<&MelosMarketplace.ListingManager>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow ListingManager")
  }

  execute {
    self.listingManager.acceptOpenBid(listingId: listingId, bidId: bidId)
  }
}