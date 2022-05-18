import MelosOpenBid from "../../contracts/MelosOpenBid.cdc"

transaction(bidId: UInt64, openBidAddress: Address) {
    let openBid: &MelosOpenBid.OpenBid{MelosOpenBid.OpenBidPublic}

    prepare(acct: AuthAccount) {
        self.openBid = getAccount(openBidAddress)
            .getCapability<&MelosOpenBid.OpenBid{MelosOpenBid.OpenBidPublic}>(
                MelosOpenBid.OpenBidPublicPath
            )!
            .borrow()
            ?? panic("Could not borrow OpenBid from provided address")
    }

    execute {
        self.openBid.cleanup(bidId: bidId)
    }
}
