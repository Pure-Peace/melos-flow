import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun getOrCreateBidManager(account: AuthAccount): Capability<&{MelosMarketplace.BidManagerPublic}> {
  let PUBLIC_PATH = MelosMarketplace.BidManagerPublicPath
  let STORAGE_PATH = MelosMarketplace.BidManagerStoragePath

  if account.borrow<&MelosMarketplace.BidManager>(from: STORAGE_PATH) == nil {
    let bidManager <- MelosMarketplace.createBidManager()
    account.save(<- bidManager, to: STORAGE_PATH)
    account.link<&{MelosMarketplace.BidManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
  }

  return account.getCapability<&{MelosMarketplace.BidManagerPublic}>(PUBLIC_PATH)
}

transaction(
  listingId: UInt64,
  bidId: UInt64
) {
  let listing: &{MelosMarketplace.ListingPublic}
  let bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>
  prepare(account: AuthAccount) {
    self.listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
    self.bidManager = getOrCreateBidManager(account: account)
  }

  execute {
    self.listing.removeBid(bidManager: self.bidManager, removeBidId: bidId)
  }
}
