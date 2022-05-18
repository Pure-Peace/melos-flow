import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import NFTStorefront from "../../contracts/core/NFTStorefront.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

pub struct ListingItem {
    pub let metadata: String
    pub let itemID: UInt64
    pub let resourceID: UInt64
    pub let owner: Address
    pub let price: UFix64

    init(
        metadata: String,
        itemID: UInt64,
        resourceID: UInt64,
        owner: Address,
        price: UFix64
    ) {
        self.metadata = metadata
        self.itemID = itemID
        self.resourceID = resourceID
        self.owner = owner
        self.price = price
    }
}


pub fun main(address: Address, listingResourceID: UInt64): ListingItem? {
    let account = getAccount(address)

    if let storefrontRef = account.getCapability<&NFTStorefront.Storefront{NFTStorefront.StorefrontPublic}>(NFTStorefront.StorefrontPublicPath).borrow() {

        if let listing = storefrontRef.borrowListing(listingResourceID: listingResourceID) {

            let details = listing.getDetails()

            let itemID = details.nftID
            let itemPrice = details.salePrice

            if let collection = getAccount(address).getCapability<&MelosNFT.Collection{NonFungibleToken.CollectionPublic, MelosNFT.MelosNFTCollectionPublic}>(MelosNFT.CollectionPublicPath).borrow() {

                if let item = collection.borrowMelosNFT(id: itemID) {

                    let owner: Address = item.owner!.address!

                    return ListingItem(
                        metadata: item.getMetadata(),
                        itemID: itemID,
                        resourceID: item.uuid,
                        owner: address,
                        price: itemPrice
                    )
                }
            }
        }
    }

    return nil
}
