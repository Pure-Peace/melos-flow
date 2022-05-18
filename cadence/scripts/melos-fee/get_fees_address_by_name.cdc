import MelosFee from "../../contracts/MelosFee.cdc"

pub fun main(name: String): Address {
    return MelosFee.feeAddressByName(name)
}