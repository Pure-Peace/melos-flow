import MelosMarketplace from "../../contracts/MelosMarketplace.cdc"

pub fun main(): String {
  return Type<MelosMarketplace>().identifier
}
