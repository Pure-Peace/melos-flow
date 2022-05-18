import FungibleToken from "../../contracts/core/FungibleToken.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"
import MelosOpenBid from "../../contracts/MelosOpenBid.cdc"

import MelosNFT from "../../contracts/MelosNFT.cdc"


transaction(bidId: UInt64, openBidAddress: Address) {
    let nft: @NonFungibleToken.NFT
    let mainVault: &FlowToken.Vault{FungibleToken.Receiver}
    let openBid: &MelosOpenBid.OpenBid{MelosOpenBid.OpenBidPublic}
    let bid: &MelosOpenBid.Bid{MelosOpenBid.BidPublic}

    prepare(acct: AuthAccount) {
        self.openBid = getAccount(openBidAddress)
            .getCapability<&MelosOpenBid.OpenBid{MelosOpenBid.OpenBidPublic}>(
                MelosOpenBid.OpenBidPublicPath
            )!
            .borrow()
            ?? panic("Could not borrow OpenBid from provided address")

        self.bid = self.openBid.borrowBid(bidId: bidId)
                    ?? panic("No Offer with that ID in OpenBid")
        let nftId = self.bid.getDetails().nftId

        let nftCollection = acct.borrow<&MelosNFT.Collection>(
            from: MelosNFT.CollectionStoragePath
        ) ?? panic("Cannot borrow NFT collection receiver from account")
        self.nft <- nftCollection.withdraw(withdrawID: nftId)

        self.mainVault = acct.borrow<&FlowToken.Vault{FungibleToken.Receiver}>(from: /storage/flowTokenVault)
            ?? panic("Cannot borrow FlowToken vault from acct storage")
    }

    execute {
        let vault <- self.bid.purchase(item: <-self.nft)!
        self.mainVault.deposit(from: <-vault)
        self.openBid.cleanup(bidId: bidId)
    }
}
