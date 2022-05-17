import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


transaction {
    prepare(signer: AuthAccount) {
        // if the account doesn't already have a collection
        if signer.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath) == nil {

            // create a new empty collection
            let collection <- MelosNFT.createEmptyCollection()
            
            // save it to the account
            signer.save(<-collection, to: MelosNFT.CollectionStoragePath)

            // create a public capability for the collection
            signer.link<&MelosNFT.Collection{NonFungibleToken.CollectionPublic, MelosNFT.MelosNFTCollectionPublic}>(MelosNFT.CollectionPublicPath, target: MelosNFT.CollectionStoragePath)
        }
    }
}
