import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


// Setup storage for MelosNFT on signer account
//
transaction {
    prepare(acct: AuthAccount) {
        if acct.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath) == nil {
          let collection <- acct.load<@MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath)
          destroy collection
        }
    }
}