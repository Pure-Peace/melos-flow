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

pub fun getOrCreateNFTCollection(account: AuthAccount): Capability<&{NonFungibleToken.Receiver}> {
  let PUBLIC_PATH = %NFT_PUBLIC_PATH%
  let STORAGE_PATH = %NFT_STORAGE_PATH%

  if account.borrow<&%NFT_NAME%.Collection>(from: STORAGE_PATH) == nil {
    let collection <- %NFT_NAME%.createEmptyCollection() as! @%NFT_NAME%.Collection
    account.save(<- collection, to: STORAGE_PATH)
    account.link<&{NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver}>(
      PUBLIC_PATH, target: STORAGE_PATH)
  }

  let capa = account.getCapability<&{NonFungibleToken.Receiver}>(PUBLIC_PATH)
  if !capa.check() {
    account.link<&{NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver}>(
      PUBLIC_PATH, target: STORAGE_PATH)
  }

  return account.getCapability<&{NonFungibleToken.Receiver}>(PUBLIC_PATH)
}

transaction(
  listingId: UInt64,
  price: UFix64
) {
  let listing: &{MelosMarketplace.ListingPublic}
  let payment: @FungibleToken.Vault
  let refund: Capability<&{FungibleToken.Receiver}>
  let collection: Capability<&{NonFungibleToken.Receiver}>
  let manager: &MelosMarketplace.MarketplaceManager
  let managerCapa: Capability<&{MelosMarketplace.MarketplaceManagerPublic}>
  prepare(account: AuthAccount) {
    let PAYMENT_TOKEN_STORAGE_PATH = %FT_STORAGE_PATH%
    self.listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")

    let paymentToken = account.borrow<&%FT_NAME%.Vault>(from: PAYMENT_TOKEN_STORAGE_PATH)
      ?? panic("Cannot borrow paymentToken '%FT_NAME%' from account path '%FT_STORAGE_PATH%'")

    self.refund = account.getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)

    self.payment <- paymentToken.withdraw(amount: price)
    
    self.collection = getOrCreateNFTCollection(account: account)

    self.manager = ensureManager(account: account)

    self.managerCapa = account.getCapability<&{MelosMarketplace.MarketplaceManagerPublic}>(MelosMarketplace.MarketplaceManagerPublicPath)
    self.managerCapa.borrow() ?? panic("Could not get managerCapability")
  }

  execute {
    self.listing.createBid(
      manager: self.managerCapa, 
      rewardCollection: self.collection, 
      refund: self.refund, 
      payment: <- self.payment
    )
  }
}