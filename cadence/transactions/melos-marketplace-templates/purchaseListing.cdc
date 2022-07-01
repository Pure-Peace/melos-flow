import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import %NFT_NAME% from %NFT_ADDRESS%
import %FT_NAME% from %FT_ADDRESS%



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
  listingId: UInt64
) {
  let listing: &{MelosMarketplace.ListingPublic}
  let payment: @FungibleToken.Vault
  let collection: Capability<&{NonFungibleToken.Receiver}>
  prepare(account: AuthAccount) {
    let PAYMENT_TOKEN_STORAGE_PATH = %FT_STORAGE_PATH%
    self.listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")

    let paymentToken = account.borrow<&%FT_NAME%.Vault>(from: PAYMENT_TOKEN_STORAGE_PATH)
      ?? panic("Cannot borrow paymentToken from account path '%FT_STORAGE_PATH%'")

    let price = self.listing.getPrice()
    self.payment <- paymentToken.withdraw(amount: price)
    self.collection = getOrCreateNFTCollection(account: account)
  }

  execute {
    self.listing.purchase(payment: <- self.payment, rewardCollection: self.collection)
    MelosMarketplace.removeListing(listingId: self.listing.uuid)
  }
}