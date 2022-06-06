import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(): {String: MelosMarketplace.FungibleTokenFeeConfig} {    
    return MelosMarketplace.getFeeConfigs()
}
