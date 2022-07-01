import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import %NFT_NAME% from %NFT_ADDRESS%
import %FT_NAME% from %FT_ADDRESS%


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

  let capa = account.getCapability<&{MelosMarketplace.MarketplaceManagerPublic}>(MelosMarketplace.MarketplaceManagerPublicPath)
  if !capa.check() {
    account.link<&{MelosMarketplace.MarketplaceManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
  }

  return managerRef ?? panic("Could not get managerRef")
}

pub fun getOrCreateNFTProvider(account: AuthAccount): Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}> {
  let %NFT_NAME%CollectionProviderPrivatePath = %NFT_PROVIDER_PRIVATE_PATH%
  let PUBLIC_PATH = %NFT_STORAGE_PATH%
  if !account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(
    %NFT_NAME%CollectionProviderPrivatePath).check() {
      account.link<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(
        %NFT_NAME%CollectionProviderPrivatePath, target: PUBLIC_PATH)
  }

  return account.getCapability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(%NFT_NAME%CollectionProviderPrivatePath)
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
  let managerCapa: Capability<&{MelosMarketplace.MarketplaceManagerPublic}>
  prepare(account: AuthAccount) {
    self.listingConfig = MelosMarketplace.Common(
      listingStartTime: listingStartTime ?? getCurrentBlock().timestamp,
      listingDuration: listingDuration,
      royaltyPercent: royaltyPercent,
      price: price
    )

    self.receiver = account.getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)
    self.nftProvider = getOrCreateNFTProvider(account: account)
    self.manager = ensureManager(account: account)

    self.managerCapa = account.getCapability<&{MelosMarketplace.MarketplaceManagerPublic}>(MelosMarketplace.MarketplaceManagerPublicPath)
    self.managerCapa.borrow() ?? panic("Could not get managerCapability")
  }

  execute {
    let result = self.manager.createListing(
      listingType: MelosMarketplace.ListingType.Common,
      nftProvider: self.nftProvider,
      nftId: nftId,
      paymentToken: Type<@%FT_NAME%.Vault>(),
      listingConfig: self.listingConfig,
      receiver: self.receiver,
      manager: self.managerCapa
    )
  }
}