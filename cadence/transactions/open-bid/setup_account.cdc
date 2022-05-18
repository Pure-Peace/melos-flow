import MelosOpenBid from "../../contracts/MelosOpenBid.cdc"

// This transaction installs the OpenBid resource in an account.

transaction {
    prepare(acct: AuthAccount) {
        if acct.borrow<&MelosOpenBid.OpenBid>(from: MelosOpenBid.OpenBidStoragePath) == nil {
            let OpenBid <- MelosOpenBid.createOpenBid() as! @MelosOpenBid.OpenBid
            acct.save(<-OpenBid, to: MelosOpenBid.OpenBidStoragePath)
            acct.link<&MelosOpenBid.OpenBid{MelosOpenBid.OpenBidPublic}>(MelosOpenBid.OpenBidPublicPath, target: MelosOpenBid.OpenBidStoragePath)
        }
    }
}
