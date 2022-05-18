import MelosFee from "../../contracts/MelosFee.cdc"

pub fun main(): {String:UFix64} {
    return {
            "buyerFee": MelosFee.buyerFee,
            "sellerFee": MelosFee.sellerFee
    }
}