module.exports = {
  borrowAccountNFT: `
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
`,
  checkAccount: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// check MelosNFT collection is available on given address
//
pub fun main(address: Address): Bool {
    return getAccount(address)
        .getCapability<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath)
        .check()
}
`,
  getAccountBalance: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// This script returns the size of an account's Melos NFT collection.

pub fun main(address: Address): Int {
    let account = getAccount(address)

    let collectionRef = account.getCapability(MelosNFT.CollectionPublicPath)!
        .borrow<&{NonFungibleToken.CollectionPublic}>()
        ?? panic("Could not borrow capability from public collection")
    
    return collectionRef.getIDs().length
}

`,
  getAccountHasNFT: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// This script returns an array of all the Melos NFT IDs in an account's collection.

pub fun main(address: Address, nftId: UInt64): Bool {
    let account = getAccount(address)

    let collectionRef = account.getCapability(MelosNFT.CollectionPublicPath)!.borrow<&{NonFungibleToken.CollectionPublic}>()
        ?? panic("Could not borrow capability from public collection")
    
    return collectionRef.getIDs().contains(nftId)
}

`,
  getAccountNFTs: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// This script returns an array of all the Melos NFT IDs in an account's collection.

pub fun main(address: Address): [UInt64] {
    let account = getAccount(address)

    let collectionRef = account.getCapability(MelosNFT.CollectionPublicPath)!.borrow<&{NonFungibleToken.CollectionPublic}>()
        ?? panic("Could not borrow capability from public collection")
    
    return collectionRef.getIDs()
}

`,
  totalSupply: `
import MelosNFT from "../../contracts/MelosNFT.cdc"

// This scripts returns the number of Melos currently in existence.

pub fun main(): UInt64 {    
    return MelosNFT.totalSupply
}

`,
  viewNFTData: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


pub fun main(address: Address, itemID: UInt64): String? {
    if let collection = getAccount(address).getCapability<&MelosNFT.Collection{MelosNFT.MelosNFTCollectionPublic}>(MelosNFT.CollectionPublicPath).borrow() {
        if let item = collection.borrowMelosNFT(id: itemID) {
            return item.getMetadata()
        }
    }

    return nil
}

`,
};
