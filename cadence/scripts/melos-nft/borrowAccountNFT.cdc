import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// Take MelosNFT token props by account address and tokenId
//
pub fun main(address: Address, tokenId: UInt64): &AnyResource {
    let collection = getAccount(address)
        .getCapability(MelosNFT.CollectionPublicPath)
        .borrow<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>()
        ?? panic("NFT Collection not found")
    return collection.borrowNFT(id: tokenId)
}