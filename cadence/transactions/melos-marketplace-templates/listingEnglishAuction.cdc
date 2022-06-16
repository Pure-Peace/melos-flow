import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import %NFT_NAME% from %NFT_ADDRESS%
import %FT_NAME% from %FT_ADDRESS%


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
  reservePrice: UFix64,
  minimumBidPercentage: UFix64,
  basePrice: UFix64
) {
  let listingConfig: MelosMarketplace.EnglishAuction
  let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
  let receiver: Capability<&{FungibleToken.Receiver}>
  let manager: &MelosMarketplace.MarketplaceManager
  prepare(account: AuthAccount) {
    self.listingConfig = MelosMarketplace.EnglishAuction(
      listingStartTime: listingStartTime ?? getCurrentBlock().timestamp,
      listingDuration: listingDuration,
      royaltyPercent: royaltyPercent,
      reservePrice: reservePrice,
      minimumBidPercentage: minimumBidPercentage,
      basePrice: basePrice
    )

    self.receiver = account.getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)
    self.nftProvider = getOrCreateNFTProvider(account: account)
    self.manager = getOrCreateManager(account: account)
  }

  execute {
    let result = self.manager.createListing(
      listingType: MelosMarketplace.ListingType.EnglishAuction,
      nftProvider: self.nftProvider,
      nftId: nftId,
      paymentToken: Type<@%FT_NAME%.Vault>(),
      listingConfig: self.listingConfig,
      receiver: self.receiver
    )
  }
}