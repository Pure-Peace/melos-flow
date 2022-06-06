import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(): Int {    
    return MelosMarketplace.getListingCount()
}
