import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


// transfer MelosNFT token with tokenId to given address
//
transaction(nftId: UInt64, recipient: Address) {
    let token: @NonFungibleToken.NFT
    let receiver: Capability<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>

    prepare(acct: AuthAccount) {
        let collection = acct.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath)
            ?? panic("Missing NFT collection on signer account")
        self.token <- collection.withdraw(withdrawID: nftId)
        self.receiver = getAccount(recipient).getCapability<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath)
    }

    execute {
        let receiver = self.receiver.borrow()!
        receiver.deposit(token: <- self.token)
    }
}