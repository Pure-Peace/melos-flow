import FungibleToken from "../contracts/core/FungibleToken.cdc"

pub fun main(address: Address): UFix64 {
    let account = getAccount(address)
    let vault = account.getCapability<&AnyResource{FungibleToken.Balance}>(/public/flowTokenBalance).borrow()
    ?? panic("Could not borrow vault ref")
    return vault.balance
}