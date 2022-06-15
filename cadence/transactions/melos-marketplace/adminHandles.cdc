import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

%ADMIN_IMPORTS%

transaction(

) {
  let admin: &MelosMarketplace.Admin
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.AdminStoragePath

    self.admin = account.borrow<&MelosMarketplace.Admin>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow Admin")
  }

  execute {
    %ADMIN_HANDLES%
  }
}