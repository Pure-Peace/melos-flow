import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun getOrCreateManager(account: AuthAccount): Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}> {
  let PUBLIC_PATH = MelosMarketplace.MarketplaceManagerPublicPath
  let STORAGE_PATH = MelosMarketplace.MarketplaceManagerStoragePath

  if account.borrow<&MelosMarketplace.MarketplaceManager>(from: STORAGE_PATH) == nil {
    let manager <- MelosMarketplace.createMarketplaceManager()
    account.save(<- manager, to: STORAGE_PATH)
    account.link<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
  }

  return account.getCapability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>(PUBLIC_PATH)
}

transaction(
  listingId: UInt64,
  bidId: UInt64
) {
  let listing: &{MelosMarketplace.ListingPublic}
  let manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>
  prepare(account: AuthAccount) {
    self.listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
    self.manager = getOrCreateManager(account: account)
  }

  execute {
    self.listing.removeBid(manager: self.manager, removeBidId: bidId)
  }
}
