import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import FlowToken from "../../contracts/core/FlowToken.cdc"

transaction(

) {
  let admin: &MelosMarketplace.Admin
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.AdminStoragePath

    self.admin = account.borrow<&MelosMarketplace.Admin>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow Admin")
  }

  execute {
    self.admin.setAllowedPaymentTokens([Type<@FlowToken.Vault>()])
  }
}