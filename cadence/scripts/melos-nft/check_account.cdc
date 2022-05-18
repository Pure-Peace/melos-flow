import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// check MelosNFT collection is available on given address
//
pub fun main(address: Address): Bool {
    return getAccount(address)
        .getCapability<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath)
        .check()
}