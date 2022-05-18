import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


// Setup storage for MelosNFT on signer account
//
transaction {
    prepare(acct: AuthAccount) {
        if acct.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath) == nil {
            let collection <- MelosNFT.createEmptyCollection() as! @MelosNFT.Collection
            acct.save(<-collection, to: MelosNFT.CollectionStoragePath)
            acct.link<&{NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath, target: MelosNFT.CollectionStoragePath)
        }
    }
}