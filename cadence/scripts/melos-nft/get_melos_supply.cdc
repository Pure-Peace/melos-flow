import MelosNFT from "../../contracts/MelosNFT.cdc"

// This scripts returns the number of Melos currently in existence.

pub fun main(): UInt64 {    
    return MelosNFT.totalSupply
}
