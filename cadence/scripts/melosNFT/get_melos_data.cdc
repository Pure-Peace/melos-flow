import NonFungibleToken from "../../contracts/NonFungibleToken.cdc"
import MetadataViews from "../../contracts/MetadataViews.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


pub fun main(address: Address, itemID: UInt64): String? {
    if let collection = getAccount(address).getCapability<&MelosNFT.Collection{NonFungibleToken.CollectionPublic, MelosNFT.MelosNFTCollectionPublic}>(MelosNFT.CollectionPublicPath).borrow() {
        if let item = collection.borrowMelosNFT(id: itemID) {
            return item.getNFTMetadata()
        }
    }

    return nil
}
