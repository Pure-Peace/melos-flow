import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"

import FungibleToken from "../../contracts/core/FungibleToken.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"


pub fun getOrCreateNFTCollection(account: AuthAccount): &MelosNFT.Collection{NonFungibleToken.Receiver} {
    let PUBLIC_PATH = MelosNFT.CollectionPublicPath
    let STORAGE_PATH = MelosNFT.CollectionStoragePath

    if let collectionRef = account.borrow<&MelosNFT.Collection>(from: STORAGE_PATH) {
        return collectionRef
    }

    let collection <- MelosNFT.createEmptyCollection() as! @MelosNFT.Collection
    let collectionRef = &collection as &MelosNFT.Collection
    account.save(<- collection, to: STORAGE_PATH)
    account.link<&MelosNFT.Collection{NonFungibleToken.CollectionPublic, MelosNFT.MelosNFTCollectionPublic}>(
      PUBLIC_PATH, target: STORAGE_PATH)

    return collectionRef
}

transaction(
  listingId: UInt64
) {
  let listing: &{MelosMarketplace.ListingPublic}
  let payment: @FungibleToken.Vault
  let collection: &MelosNFT.Collection{NonFungibleToken.Receiver}
  prepare(account: AuthAccount) {
    let PAYMENT_TOKEN_STORAGE_PATH = /storage/flowTokenVault
    self.listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")

    let paymentToken = account.borrow<&FlowToken.Vault>(from: PAYMENT_TOKEN_STORAGE_PATH)
      ?? panic("Cannot borrow paymentToken from account")

    let price = self.listing.getPrice()
    self.payment <- paymentToken.withdraw(amount: price)
    self.collection = getOrCreateNFTCollection(account: account)
  }

  execute {
    let nft <- self.listing.purchase(payment: <- self.payment)
    self.collection.deposit(token: <- nft)
  }
}