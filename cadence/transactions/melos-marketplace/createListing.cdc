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

pub fun toListingConfig(
  listingType: MelosMarketplace.ListingType, 
  params: {String: AnyStruct}
): {MelosMarketplace.ListingConfig} {
  switch listingType {
    case MelosMarketplace.ListingType.Common:
      return MelosMarketplace.Common(
        listingStartTime: params["listingStartTime"] as! UFix64, 
        listingEndTime: params["listingEndTime"] as! UFix64?, 
        price: params["price"] as! UFix64
      )
    case MelosMarketplace.ListingType.OpenBid:
      return MelosMarketplace.OpenBid(
        listingStartTime: params["listingStartTime"] as! UFix64, 
        listingEndTime: params["listingEndTime"] as! UFix64?, 
        minimumPrice: params["minimumPrice"] as! UFix64
      )
    case MelosMarketplace.ListingType.DutchAuction:
      return MelosMarketplace.DutchAuction(
        listingStartTime: params["listingStartTime"] as! UFix64, 
        listingEndTime: params["listingEndTime"] as! UFix64?, 
        startingPrice: params["startingPrice"] as! UFix64, 
        reservePrice: params["reservePrice"] as! UFix64, 
        priceCutInterval: params["priceCutInterval"] as! UFix64, 
      )
    case MelosMarketplace.ListingType.EnglishAuction:
      return MelosMarketplace.EnglishAuction(
        listingStartTime: params["listingStartTime"] as! UFix64, 
        listingEndTime: params["listingEndTime"] as! UFix64?, 
        reservePrice: params["reservePrice"] as! UFix64, 
        minimumBidPercentage: params["minimumBidPercentage"] as! UFix64, 
        basePrice: params["basePrice"] as! UFix64, 
      )
  }
  panic("Invalid listingType")
}


transaction(
  nftId: UInt64,
  rawListingType: UInt8,
  listingConfigParams: {String: AnyStruct},
) {
  let listingType: MelosMarketplace.ListingType
  let listingConfig: {MelosMarketplace.ListingConfig}
  let nftCollection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
  let refund: Capability<&{NonFungibleToken.CollectionPublic}>
  let receiver: Capability<&{FungibleToken.Receiver}>
  let listingManager: &MelosMarketplace.ListingManager
  prepare(account: AuthAccount) {
    self.listingType = MelosMarketplace.ListingType(rawListingType) ?? panic("Invalid rawListingType")
    self.listingConfig = toListingConfig(listingType: self.listingType, params: listingConfigParams)

    MelosMarketplace.checkListingConfig(self.listingType, self.listingConfig)

    self.receiver = account.getCapability<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReceiver)

    self.nftCollection = account.getCapability<&MelosNFT.Collection{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>(
      MelosNFT.CollectionPublicPath)

    self.refund = account.getCapability<&MelosNFT.Collection{NonFungibleToken.CollectionPublic}>(
      MelosNFT.CollectionPublicPath)

    self.listingManager = getOrCreateListingManager(account: account)
  }

  execute {
    let listingId = self.listingManager.createListing(
      listingType: self.listingType,
      nftCollection: self.nftCollection,
      nftId: nftId,
      paymentToken: Type<@FlowToken.Vault>(),
      refund: self.refund,
      listingConfig: self.listingConfig,
      receiver: self.receiver
    )
  }
}