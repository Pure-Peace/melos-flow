import NonFungibleToken from "../contracts/NonFungibleToken.cdc"
import MelosNFT from "../contracts/MelosNFT.cdc"

transaction{
    prepare(signer:AuthAccount){
        if signer.borrow<&MelosNFT.Collection>(from:MelosNFT.CollectionStoragePath) == nil{
            let collection <- MelosNFT.createEmptyCollection()
            signer.save(<-collection,to:MelosNFT.CollectionStoragePath)
            signer.link<&MelosNFT.Collection{NonFungibleToken.CollectionPublic,MelosNFT.MelosNFTCollectionPublic}>(MelosNFT.CollectionPublicPath, target: MelosNFT.CollectionStoragePath)
        }
    }
}