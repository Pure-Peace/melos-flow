import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


transaction {
    prepare(acct: AuthAccount) {
      let collection <- acct.load<@AnyResource>(from: MelosNFT.CollectionStoragePath)
      destroy collection
    }
}