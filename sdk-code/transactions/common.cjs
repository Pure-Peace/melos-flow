module.exports = {
  flowTokenTransfer: `
import FungibleToken from "../contracts/core/FungibleToken.cdc"
import FlowToken from "../contracts/core/FlowToken.cdc"


transaction(recipient: Address, amount: UFix64) {
    let sentVault: @FungibleToken.Vault
    prepare(signer: AuthAccount) {
        let vaultRef = signer.borrow<&FlowToken.Vault>(from:/storage/flowTokenVault) 
            ?? panic("Could not borrow reference to the owner's Vault!")
        self.sentVault <- vaultRef.withdraw(amount:amount)
    }

    execute {
      let recipientAccount = getAccount(recipient)
      let receiverRef = recipientAccount.getCapability(/public/flowTokenReceiver).borrow<&{FungibleToken.Receiver}>() 
          ?? panic("Could not borrow receiver reference to the recipient's Vault")
      receiverRef.deposit(from:<-self.sentVault)
    }
}

`,
};
