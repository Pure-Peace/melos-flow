import MelosOpenBid from "../../contracts/MelosOpenBid.cdc"

// This script returns the details for a Bid within a OpenBid

pub fun main(account: Address, bidId: UInt64): MelosOpenBid.BidDetails {
    let OpenBidRef = getAccount(account)
        .getCapability<&MelosOpenBid.OpenBid{MelosOpenBid.OpenBidPublic}>(
            MelosOpenBid.OpenBidPublicPath
        )
        .borrow()
        ?? panic("Could not borrow public OpenBid from address")

    let Bid = OpenBidRef.borrowBid(bidId: bidId)
        ?? panic("No item with that ID")
    
    return Bid.getDetails()
}
