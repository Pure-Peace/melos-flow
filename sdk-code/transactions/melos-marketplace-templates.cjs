module.exports = {
  acceptOffer: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import %NFT_NAME% from %NFT_ADDRESS%


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
  offerId: UInt64
) {
  let offer: &MelosMarketplace.Offer
  let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
  let receiver: Capability<&{FungibleToken.Receiver}>
  prepare(account: AuthAccount) {
    self.offer = MelosMarketplace.getOffer(offerId) ?? panic("offer not exists")
    self.receiver = account.getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)
    self.nftProvider = getOrCreateNFTProvider(account: account)
  }

  execute {
    self.offer.acceptOffer(nftProvider: self.nftProvider, receiver: self.receiver)
    MelosMarketplace.removeOffer(offerId: offerId)
  }
}
`,
  acceptOpenBid: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingId: UInt64,
  bidId: UInt64
) {
  let listingManager: &MelosMarketplace.ListingManager
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.ListingManagerStoragePath

    self.listingManager = account.borrow<&MelosMarketplace.ListingManager>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow ListingManager")
  }

  execute {
    self.listingManager.acceptOpenBid(listingId: listingId, bidId: bidId)
  }
}
`,
  adminHandles: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

%ADMIN_IMPORTS%

transaction(

) {
  let admin: &MelosMarketplace.Admin
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.AdminStoragePath

    self.admin = account.borrow<&MelosMarketplace.Admin>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow Admin")
  }

  execute {
    %ADMIN_HANDLES%
  }
}
`,
  createBid: `
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
    let PAYMENT_TOKEN_STORAGE_PATH = %FT_STORAGE_PATH%
    self.listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")

    let paymentToken = account.borrow<&%FT_NAME%.Vault>(from: PAYMENT_TOKEN_STORAGE_PATH)
      ?? panic("Cannot borrow paymentToken from account")

    self.refund = account.getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)

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
`,
  createOffer: `
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
`,
  listingCommon: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import %NFT_NAME% from %NFT_ADDRESS%
import %FT_NAME% from %FT_ADDRESS%


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
  let listingManager: &MelosMarketplace.ListingManager
  prepare(account: AuthAccount) {
    self.listingConfig = MelosMarketplace.Common(
      listingStartTime: listingStartTime ?? getCurrentBlock().timestamp,
      listingDuration: listingDuration,
      royaltyPercent: royaltyPercent,
      price: price
    )

    self.receiver = account.getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)
    self.nftProvider = getOrCreateNFTProvider(account: account)
    self.listingManager = getOrCreateListingManager(account: account)
  }

  execute {
    let result = self.listingManager.createListing(
      listingType: MelosMarketplace.ListingType.Common,
      nftProvider: self.nftProvider,
      nftId: nftId,
      paymentToken: Type<@%FT_NAME%.Vault>(),
      listingConfig: self.listingConfig,
      receiver: self.receiver
    )
  }
}
`,
  listingDutchAuction: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import %NFT_NAME% from %NFT_ADDRESS%
import %FT_NAME% from %FT_ADDRESS%


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
  startingPrice: UFix64,
  reservePrice: UFix64,
  priceCutInterval: UFix64
) {
  let listingConfig: MelosMarketplace.DutchAuction
  let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
  let receiver: Capability<&{FungibleToken.Receiver}>
  let listingManager: &MelosMarketplace.ListingManager
  prepare(account: AuthAccount) {
    self.listingConfig = MelosMarketplace.DutchAuction(
      listingStartTime: listingStartTime ?? getCurrentBlock().timestamp,
      listingDuration: listingDuration,
      royaltyPercent: royaltyPercent,
      startingPrice: startingPrice,
      reservePrice: reservePrice,
      priceCutInterval: priceCutInterval
    )

    self.receiver = account.getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)
    self.nftProvider = getOrCreateNFTProvider(account: account)
    self.listingManager = getOrCreateListingManager(account: account)
  }

  execute {
    let result = self.listingManager.createListing(
      listingType: MelosMarketplace.ListingType.DutchAuction,
      nftProvider: self.nftProvider,
      nftId: nftId,
      paymentToken: Type<@%FT_NAME%.Vault>(),
      listingConfig: self.listingConfig,
      receiver: self.receiver
    )
  }
}
`,
  listingEnglishAuction: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import %NFT_NAME% from %NFT_ADDRESS%
import %FT_NAME% from %FT_ADDRESS%


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
  let listingManager: &MelosMarketplace.ListingManager
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
    self.listingManager = getOrCreateListingManager(account: account)
  }

  execute {
    let result = self.listingManager.createListing(
      listingType: MelosMarketplace.ListingType.EnglishAuction,
      nftProvider: self.nftProvider,
      nftId: nftId,
      paymentToken: Type<@%FT_NAME%.Vault>(),
      listingConfig: self.listingConfig,
      receiver: self.receiver
    )
  }
}
`,
  listingOpenBid: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import %NFT_NAME% from %NFT_ADDRESS%
import %FT_NAME% from %FT_ADDRESS%


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
  minimumPrice: UFix64
) {
  let listingConfig: MelosMarketplace.OpenBid
  let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
  let receiver: Capability<&{FungibleToken.Receiver}>
  let listingManager: &MelosMarketplace.ListingManager
  prepare(account: AuthAccount) {
    self.listingConfig = MelosMarketplace.OpenBid(
      listingStartTime: listingStartTime ?? getCurrentBlock().timestamp,
      listingDuration: listingDuration,
      royaltyPercent: royaltyPercent,
      minimumPrice: minimumPrice
    )

    self.receiver = account.getCapability<&{FungibleToken.Receiver}>(%FT_RECEIVER%)
    self.nftProvider = getOrCreateNFTProvider(account: account)
    self.listingManager = getOrCreateListingManager(account: account)
  }

  execute {
    let result = self.listingManager.createListing(
      listingType: MelosMarketplace.ListingType.OpenBid,
      nftProvider: self.nftProvider,
      nftId: nftId,
      paymentToken: Type<@%FT_NAME%.Vault>(),
      listingConfig: self.listingConfig,
      receiver: self.receiver
    )
  }
}
`,
  publicCompleteEnglishAuction: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingId: UInt64
) {
  prepare(account: AuthAccount) {

  }

  execute {
    let listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
    listing.completeEnglishAuction()
  }
}
`,
  publicRemoveEndedListing: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingId: UInt64
) {
  prepare(account: AuthAccount) {

  }

  execute {
    let result = MelosMarketplace.removeListing(listingId: listingId)
  }
}
`,
  publicRemoveEndedOffer: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  offerId: UInt64
) {
  prepare(account: AuthAccount) {

  }

  execute {
    let result = MelosMarketplace.removeOffer(offerId: offerId)
  }
}
`,
  purchaseListing: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"

import FungibleToken from "../../contracts/core/FungibleToken.cdc"
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

transaction(
  listingId: UInt64
) {
  let listing: &{MelosMarketplace.ListingPublic}
  let payment: @FungibleToken.Vault
  let collection: Capability<&{NonFungibleToken.Receiver}>
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
    self.listing.purchase(payment: <- self.payment, rewardCollection: self.collection)
  }
}
`,
  removeBid: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

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
  bidId: UInt64
) {
  let listing: &{MelosMarketplace.ListingPublic}
  let bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>
  prepare(account: AuthAccount) {
    self.listing = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
    self.bidManager = getOrCreateBidManager(account: account)
  }

  execute {
    self.listing.removeBid(bidManager: self.bidManager, removeBidId: bidId)
  }
}

`,
  removeListing: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  listingId: UInt64
) {
  let listingManager: &MelosMarketplace.ListingManager
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.ListingManagerStoragePath

    self.listingManager = account.borrow<&MelosMarketplace.ListingManager>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow ListingManager")
  }

  execute {
    self.listingManager.removeListing(listingId: listingId)
  }
}
`,
  removeOffer: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(
  offerId: UInt64
) {
  let offerManager: &MelosMarketplace.OfferManager
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.OfferManagerStoragePath

    self.offerManager = account.borrow<&MelosMarketplace.OfferManager>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow OfferManager")
  }

  execute {
    self.offerManager.removeOffer(offerId: offerId)
  }
}
`,
  setupBidManager: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction {
  prepare(account: AuthAccount) {
    let PUBLIC_PATH = MelosMarketplace.BidManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.BidManagerStoragePath

    if account.borrow<&MelosMarketplace.BidManager>(from: STORAGE_PATH) == nil {
      let bidManager <- MelosMarketplace.createBidManager()
      account.save(<- bidManager, to: STORAGE_PATH)
      account.link<&{MelosMarketplace.BidManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
    }
  }
}

`,
  setupListingManager: `
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


transaction {
  prepare(account: AuthAccount) {
    let PUBLIC_PATH = MelosMarketplace.ListingManagerPublicPath
    let STORAGE_PATH = MelosMarketplace.ListingManagerStoragePath

    if account.borrow<&MelosMarketplace.ListingManager>(from: STORAGE_PATH) == nil {
      let listingManager <- MelosMarketplace.createListingManager()
      account.save(<- listingManager, to: STORAGE_PATH)
      account.link<&{MelosMarketplace.ListingManagerPublic}>(PUBLIC_PATH, target: STORAGE_PATH)
    }
  }
}

`,
};
