import MelosOpenBid from "../../contracts/MelosOpenBid.cdc"

transaction(bidId: UInt64) {
    let openBid: &MelosOpenBid.OpenBid{MelosOpenBid.OpenBidManager}

    prepare(acct: AuthAccount) {
        self.openBid = acct.borrow<&MelosOpenBid.OpenBid{MelosOpenBid.OpenBidManager}>(from: MelosOpenBid.OpenBidStoragePath)
            ?? panic("Missing or mis-typed MelosOpenBid.OpenBid")
    }

    execute {
        self.openBid.removeBid(bidId: bidId)
    }
}