import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(): [Type] {
  return MelosMarketplace.getAllowedPaymentTokens()
}
