import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"

import FungibleToken from "../../contracts/core/FungibleToken.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"


pub fun getOrCreateListingManager(account: AuthAccount): &MelosMarketplace.ListingManager {
    let PUBLIC_PATH = MelosMarketplace.ListingManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.ListingManagerStoragePath

    if let listingManagerRef = account.borrow<&MelosMarketplace.ListingManager>(from: STORAGE_PATH) {
        return listingManagerRef
    }

    let listingManager <- MelosMarketplace.createListingManager()
    let listingManagerRef = &listingManager as &MelosMarketplace.ListingManager
    account.save(<- listingManager, to: STORAGE_PATH)
    account.link<&{MelosMarketplace.ListingManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)

    return listingManagerRef
}


transaction(
  nftId: UInt64,
  listingStartTime: UFix64,
  listingEndTime: UFix64?,
  startingPrice: UFix64,
  reservePrice: UFix64,
  priceCutInterval: UFix64
) {
  let listingConfig: MelosMarketplace.DutchAuction
  let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
  let refund: Capability<&{NonFungibleToken.CollectionPublic}>
  let receiver: Capability<&{FungibleToken.Receiver}>
  let listingManager: &MelosMarketplace.ListingManager
  prepare(account: AuthAccount) {
    self.listingConfig = MelosMarketplace.DutchAuction(
      listingStartTime: listingStartTime,
      listingEndTime: listingEndTime,
      startingPrice: startingPrice,
      reservePrice: reservePrice,
      priceCutInterval: priceCutInterval
    )

    self.receiver = account.getCapability<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReceiver)

    self.nftProvider = account.getCapability<&MelosNFT.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(
      MelosNFT.CollectionPublicPath)

    self.refund = account.getCapability<&MelosNFT.Collection{NonFungibleToken.CollectionPublic}>(
      MelosNFT.CollectionPublicPath)

    self.listingManager = getOrCreateListingManager(account: account)
  }

  execute {
    let result = self.listingManager.createListing(
      listingType: MelosMarketplace.ListingType.DutchAuction,
      nftProvider: self.nftProvider,
      nftId: nftId,
      paymentToken: Type<@FlowToken.Vault>(),
      refund: self.refund,
      listingConfig: self.listingConfig,
      receiver: self.receiver
    )
  }
}