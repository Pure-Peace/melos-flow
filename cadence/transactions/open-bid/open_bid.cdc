import FungibleToken from "../../contracts/core/FungibleToken.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"

import MelosOpenBid from "../../contracts/MelosOpenBid.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

transaction(nftId: UInt64, amount: UFix64) {
    let nftReceiver: Capability<&{NonFungibleToken.CollectionPublic}>
    let vaultRef: Capability<&{FungibleToken.Provider,FungibleToken.Balance,FungibleToken.Receiver}>
    let openBid: &MelosOpenBid.OpenBid

    prepare(account: AuthAccount) {
        let vaultRefPrivatePath = /private/FlowTokenVaultRefForMelosOpenBid

        self.nftReceiver = account.getCapability<&{NonFungibleToken.CollectionPublic}>(/public/NFTCollection)!
        assert(self.nftReceiver.check(), message: "Missing or mis-typed MelosNFT receiver")

        if !account.getCapability<&{FungibleToken.Provider,FungibleToken.Balance,FungibleToken.Receiver}>(vaultRefPrivatePath)!.check() {
            account.link<&{FungibleToken.Provider,FungibleToken.Balance,FungibleToken.Receiver}>(vaultRefPrivatePath, target: /storage/flowTokenVault)
        }

        self.vaultRef = account.getCapability<&{FungibleToken.Provider,FungibleToken.Balance,FungibleToken.Receiver}>(vaultRefPrivatePath)!
        assert(self.vaultRef.check(), message: "Missing or mis-typed fungible token vault ref")

        self.openBid = account.borrow<&MelosOpenBid.OpenBid>(from: MelosOpenBid.OpenBidStoragePath)
            ?? panic("Missing or mis-typed MelosOpenBid OpenBid")
    }

    execute {
        let cut = MelosOpenBid.Cut(
            receiver: getAccount(0x00).getCapability<&{FungibleToken.Receiver}>(/public/NFTCollection),
            amount: amount
        )
        self.openBid.createBid(
            vaultRefCapability: self.vaultRef,
            offerPrice: amount,
            rewardCapability: self.nftReceiver,
            nftType: Type<@MelosNFT.NFT>(),
            nftId: nftId,
            cuts: []
        )
    }
}
