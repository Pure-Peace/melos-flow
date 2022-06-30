import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


pub fun main(address: Address): {UInt64: MelosMarketplace.NFTRecord} {
    let account = getAccount(address)

    let manager = account.getCapability(MelosMarketplace.MarketplaceManagerPublicPath)
        .borrow<&{MelosMarketplace.MarketplaceManagerPublic}>()
          ?? panic("Could not borrow manager capability from MarketplaceManagerPublicPath")
    
    return manager.getlistings()
}
