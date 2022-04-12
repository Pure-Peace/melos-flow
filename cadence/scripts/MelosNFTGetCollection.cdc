import NonFungibleToken from "../contracts/NonFungibleToken.cdc"
import MelosNFT from "../contracts/MelosNFT.cdc"

pub fun main(address:Address):Bool{
    let account = getAccount(address);
    let collection = account.getCapability(MelosNFT.CollectionPublicPath)
        .borrow<&MelosNFT.Collection{NonFungibleToken.CollectionPublic,MelosNFT.MelosNFTCollectionPublic}>()
        ?? panic("Could not borrow capability from public collection");
    return true
}