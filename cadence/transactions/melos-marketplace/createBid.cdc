import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import MelosNFT from "../../contracts/MelosNFT.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"


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
  price: UFix64
) {
  let listing: &{MelosMarketplace.ListingPublic}
  let payment: @FungibleToken.Vault
  let refund: Capability<&{FungibleToken.Receiver}>
  let collection: Capability<&{NonFungibleToken.Receiver}>
  let bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>
  prepare(account: AuthAccount) {
    let PAYMENT_TOKEN_STORAGE_PATH = /storage/flowTokenVault
    self.listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")

    let paymentToken = account.borrow<&FlowToken.Vault>(from: PAYMENT_TOKEN_STORAGE_PATH)
      ?? panic("Cannot borrow paymentToken 'FlowToken' from account path '/storage/flowTokenVault'")

    self.refund = account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)

    self.payment <- paymentToken.withdraw(amount: price)
    
    self.collection = getOrCreateNFTCollection(account: account)

    self.bidManager = getOrCreateBidManager(account: account)
  }

  execute {
    self.listing.createBid(
      bidManager: self.bidManager, 
      rewardCollection: self.collection, 
      refund: self.refund, 
      payment: <- self.payment
    )
  }
}