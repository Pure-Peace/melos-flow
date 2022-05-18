import FungibleToken from "../../contracts/core/FungibleToken.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"

import MelosOpenBid from "../../contracts/MelosOpenBid.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

transaction(nftId: UInt64, price: UFix64, parts: {Address:UFix64}) {
    let openBid: &MelosOpenBid.OpenBid
    let nftReceiver: Capability<&{NonFungibleToken.CollectionPublic}>
    let vaultRef: Capability<&{FungibleToken.Provider,FungibleToken.Balance,FungibleToken.Receiver}>

    prepare(account: AuthAccount) {
        if !account.getCapability<&{MelosNFT.MelosNFTCollectionPublic,NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath).check() {
            if account.borrow<&AnyResource>(from: MelosNFT.CollectionStoragePath) != nil {
                account.unlink(MelosNFT.CollectionPublicPath)
                account.link<&{MelosNFT.MelosNFTCollectionPublic,NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath, target: MelosNFT.CollectionStoragePath)
            } else {
                let collection <- MelosNFT.createEmptyCollection() as! @MelosNFT.Collection
                account.save(<-collection, to: MelosNFT.CollectionStoragePath)
                account.link<&{MelosNFT.MelosNFTCollectionPublic,NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath, target: MelosNFT.CollectionStoragePath)
            }
        }

        self.nftReceiver = account.getCapability<&{NonFungibleToken.CollectionPublic}>(MelosNFT.CollectionPublicPath)
        assert(self.nftReceiver.check(), message: "Missing or mis-typed Melos receiver")

        if !account.getCapability<&{FungibleToken.Provider,FungibleToken.Balance,FungibleToken.Receiver}>(/private/FlowToken_vaultRef)!.check() {
            account.link<&{FungibleToken.Provider,FungibleToken.Balance,FungibleToken.Receiver}>(/private/FlowToken_vaultRef, target: /storage/flowTokenVault)
        }

        self.vaultRef = account.getCapability<&{FungibleToken.Provider,FungibleToken.Balance,FungibleToken.Receiver}>(/private/FlowToken_vaultRef)!
        assert(self.vaultRef.check(), message: "Missing or mis-typed fungible token vault ref")

        if account.borrow<&MelosOpenBid.OpenBid>(from: MelosOpenBid.OpenBidStoragePath) == nil {
            let openBid <- MelosOpenBid.createOpenBid()
            account.save(<-openBid, to: MelosOpenBid.OpenBidStoragePath)
            account.link<&MelosOpenBid.OpenBid{MelosOpenBid.OpenBidPublic}>(MelosOpenBid.OpenBidPublicPath, target: MelosOpenBid.OpenBidStoragePath)
        }

        self.openBid = account.borrow<&MelosOpenBid.OpenBid>(from: MelosOpenBid.OpenBidStoragePath)
            ?? panic("Missing or mis-typed MelosOpenBid OpenBid")
    }

    execute {
        var amount = price
        let cuts: [MelosOpenBid.Cut] = []
        for address in parts.keys {
            amount = amount + parts[address]!
            cuts.append(
                MelosOpenBid.Cut(
                    receiver: getAccount(address).getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver),
                    amount: parts[address]!,
                )
            )
        }

        self.openBid.createBid(
            vaultRefCapability: self.vaultRef,
            offerPrice: amount,
            rewardCapability: self.nftReceiver,
            nftType: Type<@MelosNFT.NFT>(),
            nftId: nftId,
            cuts: cuts,
        )
    }
}