import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

%ADMIN_IMPORTS%

transaction(

) {
  let admin: &MelosMarketplace.Admin
  %SELF_VARS%
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.AdminStoragePath

    self.admin = account.borrow<&MelosMarketplace.Admin>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow Admin")

    %SELF_VARS_INIT%
  }

  execute {
    %ADMIN_HANDLES%
  }
}