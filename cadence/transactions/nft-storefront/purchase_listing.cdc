import FungibleToken from "../../contracts/core/FungibleToken.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"
import NFTStorefront from "../../contracts/core/NFTStorefront.cdc"

import MelosNFT from "../../contracts/MelosNFT.cdc"

pub fun getOrCreateCollection(account: AuthAccount): &MelosNFT.Collection{NonFungibleToken.Receiver} {
    if let collectionRef = account.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath) {
        return collectionRef
    }

    // create a new empty collection
    let collection <- MelosNFT.createEmptyCollection() as! @MelosNFT.Collection

    let collectionRef = &collection as &MelosNFT.Collection
    
    // save it to the account
    account.save(<-collection, to: MelosNFT.CollectionStoragePath)

    // create a public capability for the collection
    account.link<&MelosNFT.Collection{NonFungibleToken.CollectionPublic, MelosNFT.MelosNFTCollectionPublic}>(MelosNFT.CollectionPublicPath, target: MelosNFT.CollectionStoragePath)

    return collectionRef
}

transaction(listingResourceID: UInt64, storefrontAddress: Address) {

    let paymentVault: @FungibleToken.Vault
    let melosNFTCollection: &MelosNFT.Collection{NonFungibleToken.Receiver}
    let storefront: &NFTStorefront.Storefront{NFTStorefront.StorefrontPublic}
    let listing: &NFTStorefront.Listing{NFTStorefront.ListingPublic}

    prepare(account: AuthAccount) {
        self.storefront = getAccount(storefrontAddress)
            .getCapability<&NFTStorefront.Storefront{NFTStorefront.StorefrontPublic}>(
                NFTStorefront.StorefrontPublicPath
            )!
            .borrow()
            ?? panic("Could not borrow Storefront from provided address")

        self.listing = self.storefront.borrowListing(listingResourceID: listingResourceID)
            ?? panic("No Listing with that ID in Storefront")
        
        let price = self.listing.getDetails().salePrice

        let mainFLOWVault = account.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Cannot borrow FLOW vault from account storage")
        
        self.paymentVault <- mainFLOWVault.withdraw(amount: price)

        self.melosNFTCollection = getOrCreateCollection(account: account)
    }

    execute {
        let item <- self.listing.purchase(
            payment: <-self.paymentVault
        )

        self.melosNFTCollection.deposit(token: <-item)

        self.storefront.cleanup(listingResourceID: listingResourceID)
    }
}
