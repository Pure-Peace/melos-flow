import MelosFee from "../../contracts/MelosFee.cdc"

pub fun main(): {String:Address} {
    return MelosFee.addressMap()
}