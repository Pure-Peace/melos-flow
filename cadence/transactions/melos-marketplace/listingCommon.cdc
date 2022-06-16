import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import MelosNFT from "../../contracts/MelosNFT.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"


pub fun getOrCreateManager(account: AuthAccount): &MelosMarketplace.MarketplaceManager {
    let PUBLIC_PATH = MelosMarketplace.MarketplaceManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.MarketplaceManagerStoragePath

    if let managerRef = account.borrow<&MelosMarketplace.MarketplaceManager>(from: STORAGE_PATH) {
        return managerRef
    }

    let manager <- MelosMarketplace.createMarketplaceManager()
    let managerRef = &manager as &MelosMarketplace.MarketplaceManager
    account.save(<- manager, to: STORAGE_PATH)
    account.link<&{MelosMarketplace.ListingManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)

    return managerRef
}

pub fun getOrCreateNFTProvider(account: AuthAccount): Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}> {
  let MelosNFTCollectionProviderPrivatePath = /private/MelosNFTCollectionProviderPrivatePath
  let PUBLIC_PATH = MelosNFT.CollectionStoragePath
  if !account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(
    MelosNFTCollectionProviderPrivatePath).check() {
      account.link<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(
        MelosNFTCollectionProviderPrivatePath, target: PUBLIC_PATH)
  }

  return account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(MelosNFTCollectionProviderPrivatePath)
}


transaction(
  nftId: UInt64,
  listingStartTime: UFix64?, 
  listingDuration: UFix64?, 
  royaltyPercent: UFix64?,
  price: UFix64
) {
  let listingConfig: MelosMarketplace.Common
  let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
  let receiver: Capability<&{FungibleToken.Receiver}>
  let manager: &MelosMarketplace.MarketplaceManager
  prepare(account: AuthAccount) {
    self.listingConfig = MelosMarketplace.Common(
      listingStartTime: listingStartTime ?? getCurrentBlock().timestamp,
      listingDuration: listingDuration,
      royaltyPercent: royaltyPercent,
      price: price
    )

    self.receiver = account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
    self.nftProvider = getOrCreateNFTProvider(account: account)
    self.manager = getOrCreateManager(account: account)
  }

  execute {
    let result = self.manager.createListing(
      listingType: MelosMarketplace.ListingType.Common,
      nftProvider: self.nftProvider,
      nftId: nftId,
      paymentToken: Type<@FlowToken.Vault>(),
      listingConfig: self.listingConfig,
      receiver: self.receiver
    )
  }
}