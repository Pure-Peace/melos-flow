import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

transaction(

) {
  let admin: &MelosMarketplace.Admin
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.AdminStoragePath

    self.admin = account.borrow<&MelosMarketplace.Admin>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow Admin")
  }

  execute {
    // self.admin.addAllowedPaymentTokens(newAllowedPaymentTokens)
    // self.admin.removeAllowedPaymentTokens(removedPaymentTokens)
    // self.admin.removeTokenFeeConfig(tokenType)
    // self.admin.setAllowedPaymentTokens(newAllowedPaymentTokens)
    // self.admin.setMaxAuctionDuration(newDuration)
    // self.admin.setMinimumListingDuration(newDuration)
    // self.admin.setTokenFeeConfig(tokenType: tokenType, config: config)
  }
}