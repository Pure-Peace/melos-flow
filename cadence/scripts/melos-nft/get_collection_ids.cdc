import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// This script returns an array of all the Melos NFT IDs in an account's collection.

pub fun main(address: Address): [UInt64] {
    let account = getAccount(address)

    let collectionRef = account.getCapability(MelosNFT.CollectionPublicPath)!.borrow<&{NonFungibleToken.CollectionPublic}>()
        ?? panic("Could not borrow capability from public collection")
    
    return collectionRef.getIDs()
}
