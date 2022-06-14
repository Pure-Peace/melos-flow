import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import %NFT_NAME% from %NFT_ADDRESS%
import %FT_NAME% from %FT_ADDRESS%


pub fun getOrCreateOfferManager(account: AuthAccount): &MelosMarketplace.OfferManager {
    let PUBLIC_PATH = MelosMarketplace.OfferManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.OfferManagerStoragePath

    if let offerManagerRef = account.borrow<&MelosMarketplace.OfferManager>(from: STORAGE_PATH) {
      return offerManagerRef
    }

    let offerManager <- MelosMarketplace.createOfferManager()
    let offerManagerRef = &offerManager as &MelosMarketplace.OfferManager
    account.save(<- offerManager, to: STORAGE_PATH)
    account.link<&{MelosMarketplace.OfferManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)

    return offerManagerRef
}

pub fun getOrCreateNFTCollection(account: AuthAccount): Capability<&{NonFungibleToken.Receiver}> {
  let PUBLIC_PATH = %NFT_PUBLIC_PATH%
  let STORAGE_PATH = %NFT_STORAGE_PATH%

  if account.borrow<&%NFT_NAME%.Collection>(from: STORAGE_PATH) == nil {
    let collection <- %NFT_NAME%.createEmptyCollection() as! @%NFT_NAME%.Collection
    account.save(<- collection, to: STORAGE_PATH)
    account.link<&{NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver}>(
      PUBLIC_PATH, target: STORAGE_PATH)
  }

  return account.getCapability<&{NonFungibleToken.Receiver}>(PUBLIC_PATH)
}

transaction(
  nftId: UInt64,
  offerDuration: UFix64, 
  offerPrice: UFix64,
  offerStartTime: UFix64?,
  royaltyPercent: UFix64?
) {
  let payment: @FungibleToken.Vault
  let collection: Capability<&{NonFungibleToken.Receiver}>
  let refund: Capability<&{FungibleToken.Receiver}>
  let offerManager: &MelosMarketplace.OfferManager
  let offerManagerCapability: Capability<&{MelosMarketplace.OfferManagerPublic}>
  prepare(account: AuthAccount) {
    let PAYMENT_TOKEN_STORAGE_PATH = %FT_STORAGE_PATH%

    let paymentToken = account.borrow<&%FT_NAME%.Vault>(from: PAYMENT_TOKEN_STORAGE_PATH)
      ?? panic("Cannot borrow paymentToken from account")

    self.refund = account.getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)

    self.payment <- paymentToken.withdraw(amount: offerPrice)

    self.collection = getOrCreateNFTCollection(account: account)
    
    self.offerManager = getOrCreateOfferManager(account: account)
    self.offerManagerCapability = account.getCapability<&{MelosMarketplace.OfferManagerPublic}>(MelosMarketplace.OfferManagerPublicPath)
  }

  execute {
    let result = self.offerManager.createOffer(
      nftId: nftId,
      nftType: Type<@%NFT_NAME%.NFT>(),
      offerStartTime: offerStartTime ?? getCurrentBlock().timestamp,
      offerDuration: offerDuration,
      payment: <- self.payment,
      rewardCollection: self.collection,
      refund: self.refund,
      offerManager: self.offerManagerCapability,
      royaltyPercent: royaltyPercent
    )
  }
}