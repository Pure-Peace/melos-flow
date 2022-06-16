import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(address: Address): {UInt64: UInt64} {
    let account = getAccount(address)

    let manager = account.getCapability(MelosMarketplace.MarketplaceManagerPublicPath)
        .borrow<&{MelosMarketplace.ListingManagerPublic}>()
          ?? panic("Could not borrow manager capability from MarketplaceManagerPublicPath")
    
    return manager.getlistings()
}
