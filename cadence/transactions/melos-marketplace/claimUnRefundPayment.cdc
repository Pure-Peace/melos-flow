import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"
import FungibleToken from "../../contracts/core/FungibleToken.cdc"

import FlowToken from "../../contracts/core/FlowToken.cdc"


transaction() {
  let manager: &MelosMarketplace.MarketplaceManager
  let refund: Capability<&{FungibleToken.Receiver}>
  prepare(account: AuthAccount) {
    let STORAGE_PATH = MelosMarketplace.MarketplaceManagerStoragePath

    self.manager = account.borrow<&MelosMarketplace.MarketplaceManager>(from: STORAGE_PATH) 
      ?? panic("Cannot borrow MarketplaceManager")

    self.refund = account.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
  }

  execute {
    MelosMarketplace.claimUnRefundPayments(manager: self.manager, paymentType: Type<@FlowToken.Vault>(), refund: self.refund)
  }
}