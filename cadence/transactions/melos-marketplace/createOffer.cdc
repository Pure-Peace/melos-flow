import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"

import FungibleToken from "../../contracts/core/FungibleToken.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"

pub struct OfferManager {
  pub let offerManagerRef: &MelosMarketplace.OfferManager
  pub let offerManagerCapability: Capability<&{MelosMarketplace.OfferManagerPublic}>

  init(
    offerManagerRef: &MelosMarketplace.OfferManager,
    offerManagerCapability: Capability<&{MelosMarketplace.OfferManagerPublic}>
  ) {
    self.offerManagerRef = offerManagerRef
    self.offerManagerCapability = offerManagerCapability
  }
}

pub fun getOrCreateOfferManager(account: AuthAccount): OfferManager {
    let PUBLIC_PATH = MelosMarketplace.OfferManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.OfferManagerStoragePath

    if let offerManagerRef = account.borrow<&MelosMarketplace.OfferManager>(from: STORAGE_PATH) {
      return OfferManager(
        offerManagerRef: offerManagerRef, 
        offerManagerCapability: account.getCapability<&{MelosMarketplace.OfferManagerPublic}>(PUBLIC_PATH)
      )
    }

    let offerManager <- MelosMarketplace.createOfferManager()
    let offerManagerRef = &offerManager as &MelosMarketplace.OfferManager
    account.save(<- offerManager, to: STORAGE_PATH)
    account.link<&{MelosMarketplace.ListingManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)

    return OfferManager(
      offerManagerRef: offerManagerRef, 
      offerManagerCapability: account.getCapability<&{MelosMarketplace.OfferManagerPublic}>(PUBLIC_PATH)
    )
}

pub fun getOrCreateNFTCollection(account: AuthAccount): Capability<&{NonFungibleToken.Receiver}> {
  let PUBLIC_PATH = MelosNFT.CollectionPublicPath
  let STORAGE_PATH = MelosNFT.CollectionStoragePath

  if account.borrow<&MelosNFT.Collection>(from: STORAGE_PATH) == nil {
    let collection <- MelosNFT.createEmptyCollection() as! @MelosNFT.Collection
    account.save(<- collection, to: STORAGE_PATH)
    account.link<&{NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver}>(
      PUBLIC_PATH, target: STORAGE_PATH)
  }

  return account.getCapability<&{NonFungibleToken.Receiver}>(PUBLIC_PATH)
}

transaction(
  nftId: UInt64,
  listingStartTime: UFix64, 
  listingDuration: UFix64, 
  offerPrice: UFix64,
  royaltyPercent: UFix64?
) {
  let payment: @FungibleToken.Vault
  let collection: Capability<&{NonFungibleToken.Receiver}>
  let refund: Capability<&{FungibleToken.Receiver}>
  let offerManager: OfferManager
  prepare(account: AuthAccount) {
    let PAYMENT_TOKEN_STORAGE_PATH = /storage/flowTokenVault

    let paymentToken = account.borrow<&FlowToken.Vault>(from: PAYMENT_TOKEN_STORAGE_PATH)
      ?? panic("Cannot borrow paymentToken from account")

    self.refund = account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)

    self.payment <- paymentToken.withdraw(amount: offerPrice)

    self.collection = getOrCreateNFTCollection(account: account)
    
    self.offerManager = getOrCreateOfferManager(account: account)
  }

  execute {
    let result = self.offerManager.offerManagerRef.createOffer(
      nftId: nftId,
      nftType: Type<@MelosNFT.NFT>(),
      listingStartTime: listingStartTime,
      listingDuration: listingDuration,
      payment: <- self.payment,
      rewardCollection: self.collection,
      refund: self.refund,
      offerManager: self.offerManager.offerManagerCapability,
      royaltyPercent: royaltyPercent
    )
  }
}