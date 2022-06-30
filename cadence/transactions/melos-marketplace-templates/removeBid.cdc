import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun ensureManager(account: AuthAccount): &MelosMarketplace.MarketplaceManager {
  let PUBLIC_PATH = MelosMarketplace.MarketplaceManagerPublicPath
  let STORAGE_PATH = MelosMarketplace.MarketplaceManagerStoragePath

  var managerRef = account.borrow<&MelosMarketplace.MarketplaceManager>(from: STORAGE_PATH)
  if managerRef == nil {
    let manager <- MelosMarketplace.createMarketplaceManager()
    managerRef = &manager as &MelosMarketplace.MarketplaceManager
    account.save(<- manager, to: STORAGE_PATH)
    account.link<&{MelosMarketplace.MarketplaceManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
  }

  return managerRef ?? panic("Could not get managerRef")
}

transaction(
  listingId: UInt64,
  bidId: UInt64
) {
  let listing: &{MelosMarketplace.ListingPublic}
  let manager: &MelosMarketplace.MarketplaceManager
  let managerCapa: Capability<&{MelosMarketplace.MarketplaceManagerPublic}>
  prepare(account: AuthAccount) {
    self.listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
    self.manager = ensureManager(account: account)

    self.managerCapa = account.getCapability<&{MelosMarketplace.MarketplaceManagerPublic}>(MelosMarketplace.MarketplaceManagerPublicPath)
    self.managerCapa.borrow() ?? panic("Could not get managerCapability")
  }

  execute {
    self.listing.removeBid(manager: self.managerCapa, removeBidId: bidId)
  }
}
