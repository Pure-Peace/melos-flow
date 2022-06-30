import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingId: UInt64,
  bidId: UInt64
) {
  let manager: &MelosMarketplace.MarketplaceManager
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.MarketplaceManagerStoragePath

    self.manager = account.borrow<&MelosMarketplace.MarketplaceManager>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow MarketplaceManager")
  }

  execute {
    self.manager.acceptOpenBid(listingId: listingId, bidId: bidId)
    MelosMarketplace.removeListing(listingId: listingId)
  }
}