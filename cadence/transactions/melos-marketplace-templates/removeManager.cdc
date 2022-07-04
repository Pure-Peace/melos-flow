import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"


transaction {
    prepare(acct: AuthAccount) {
      let manager <- acct.load<@AnyResource>(from: MelosMarketplace.MarketplaceManagerStoragePath)
      destroy manager
    }
}