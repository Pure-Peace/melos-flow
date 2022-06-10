import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"

import FungibleToken from "../../contracts/core/FungibleToken.cdc"

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
  offerId: UInt64
) {
  let offer: &MelosMarketplace.Offer
  let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
  let receiver: Capability<&{FungibleToken.Receiver}>
  prepare(account: AuthAccount) {
    self.offer = MelosMarketplace.getOffer(offerId) ?? panic("offer not exists")
    self.receiver = account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
    self.nftProvider = getOrCreateNFTProvider(account: account)
  }

  execute {
    self.offer.acceptOffer(nftProvider: self.nftProvider, receiver: self.receiver)
    MelosMarketplace.removeOffer(offerId: offerId)
  }
}