import FungibleToken from "../../contracts/core/FungibleToken.cdc"
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"
import MelosOpenBid from "../../contracts/MelosOpenBid.cdc"

import MelosNFT from "../../contracts/MelosNFT.cdc"


transaction(bidId: UInt64, openBidAddress: Address, parts: {Address:UFix64}) {
    let openBid: &MelosOpenBid.OpenBid{MelosOpenBid.OpenBidPublic}
    let bid: &MelosOpenBid.Bid{MelosOpenBid.BidPublic}
    let nft: @NonFungibleToken.NFT
    let mainVault: &{FungibleToken.Receiver}

    prepare(account: AuthAccount) {
        self.openBid = getAccount(openBidAddress)
            .getCapability(MelosOpenBid.OpenBidPublicPath)!
            .borrow<&MelosOpenBid.OpenBid{MelosOpenBid.OpenBidPublic}>()
            ?? panic("Could not borrow OpenBid from provided address")

        self.bid = self.openBid.borrowBid(bidId: bidId)
            ?? panic("No Offer with that ID in OpenBid")

        let nftId = self.bid.getDetails().nftId
        let nftCollection = account.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath)
            ?? panic("Cannot borrow NFT collection receiver from account")
        self.nft <- nftCollection.withdraw(withdrawID: nftId)

        self.mainVault = account.borrow<&{FungibleToken.Receiver}>(from: /storage/flowTokenVault)
            ?? panic("Cannot borrow FlowToken vault from account storage")
    }

    execute {
        let vault <- self.bid.purchase(item: <-self.nft)!
        for address in parts.keys {
            let receiver = getAccount(address).getCapability(/public/flowTokenReceiver).borrow<&{FungibleToken.Receiver}>()!
            let part <- vault.withdraw(amount: parts[address]!)
            receiver.deposit(from: <- part)
        }
        self.mainVault.deposit(from: <-vault)
        self.openBid.cleanup(bidId: bidId)
    }
}