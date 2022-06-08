import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(address: Address): Int {
    let account = getAccount(address)

    let listingManager = account.getCapability(MelosMarketplace.ListingManagerPublicPath)
        .borrow<&{MelosMarketplace.ListingManagerPublic}>()
        ?? panic("Could not borrow capability from public ListingManager")
    
    return listingManager.getlistings().length
}
