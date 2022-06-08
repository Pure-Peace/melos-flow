import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(address: Address): {UInt64: UInt64} {
    let account = getAccount(address)

    let listingManager = account.getCapability(MelosMarketplace.ListingManagerPublicPath)
        .borrow<&{MelosMarketplace.ListingManagerPublic}>()
        ?? panic("Could not borrow capability from public ListingManager")
    
    return listingManager.getlistings()
}
