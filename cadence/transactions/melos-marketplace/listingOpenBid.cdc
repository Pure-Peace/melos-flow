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

pub fun getOrCreateNFTProvider(account: AuthAccount): Capability<&MelosNFT.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}> {
  let MelosNFTCollectionProviderPrivatePath = /private/MelosNFTCollectionProviderPrivatePath
  if !account.getCapability<&MelosNFT.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(
    MelosNFTCollectionProviderPrivatePath).check() {
      account.link<&MelosNFT.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(
        MelosNFTCollectionProviderPrivatePath, target: MelosNFT.CollectionStoragePath)
  }

  return account.getCapability<&MelosNFT.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(MelosNFTCollectionProviderPrivatePath)
}


transaction(
  nftId: UInt64,
  listingStartTime: UFix64,
  listingEndTime: UFix64?,
  royaltyPercent: UFix64?,
  minimumPrice: UFix64
) {
  let listingConfig: MelosMarketplace.OpenBid
  let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
  let refund: Capability<&{NonFungibleToken.CollectionPublic}>
  let receiver: Capability<&{FungibleToken.Receiver}>
  let listingManager: &MelosMarketplace.ListingManager
  prepare(account: AuthAccount) {
    self.listingConfig = MelosMarketplace.OpenBid(
      listingStartTime: listingStartTime,
      listingEndTime: listingEndTime,
      royaltyPercent: royaltyPercent,
      minimumPrice: minimumPrice
    )

    self.receiver = account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
    self.nftProvider = getOrCreateNFTProvider(account: account)
    self.refund = account.getCapability<&{NonFungibleToken.CollectionPublic}>(MelosNFT.CollectionPublicPath)
    self.listingManager = getOrCreateListingManager(account: account)
  }

  execute {
    let result = self.listingManager.createListing(
      listingType: MelosMarketplace.ListingType.OpenBid,
      nftProvider: self.nftProvider,
      nftId: nftId,
      paymentToken: Type<@FlowToken.Vault>(),
      refund: self.refund,
      listingConfig: self.listingConfig,
      receiver: self.receiver
    )
  }
}