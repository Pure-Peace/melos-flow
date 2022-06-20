export default {
  depositFusdMinter: `
import FUSD from "../contracts/core/FUSD.cdc"

transaction(minterAddress: Address) {

    let resourceStoragePath: StoragePath
    let capabilityPrivatePath: CapabilityPath
    let minterCapability: Capability<&FUSD.Minter>

    prepare(adminAccount: AuthAccount) {

        // These paths must be unique within the FUSD contract account's storage
        self.resourceStoragePath = /storage/minter_01
        self.capabilityPrivatePath = /private/minter_01

        // Create a reference to the admin resource in storage.
        let tokenAdmin = adminAccount.borrow<&FUSD.Administrator>(from: FUSD.AdminStoragePath)
            ?? panic("Could not borrow a reference to the admin resource")

        // Create a new minter resource and a private link to a capability for it in the admin's storage.
        let minter <- tokenAdmin.createNewMinter()
        adminAccount.save(<- minter, to: self.resourceStoragePath)
        self.minterCapability = adminAccount.link<&FUSD.Minter>(
            self.capabilityPrivatePath,
            target: self.resourceStoragePath
        ) ?? panic("Could not link minter")

    }

    execute {
        // This is the account that the capability will be given to
        let minterAccount = getAccount(minterAddress)

        let capabilityReceiver = minterAccount.getCapability
            <&FUSD.MinterProxy{FUSD.MinterProxyPublic}>
            (FUSD.MinterProxyPublicPath)!
            .borrow() ?? panic("Could not borrow capability receiver reference")

        capabilityReceiver.setMinterCapability(cap: self.minterCapability)
    }

}
`,
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
  link: `
%IMPORTS%

transaction() {
    prepare(signer: AuthAccount) {
      signer.link<%LINK_TARGET%>(
        %CAPABILITY_PATH%,
        target: %TARGET_PATH%
      )
    }
}

`,
  mintFusd: `
import FungibleToken from "../contracts/core/FungibleToken.cdc"
import FUSD from "../contracts/core/FUSD.cdc"

transaction(amount: UFix64, to: Address) {

    let tokenMinter: &FUSD.MinterProxy
    let tokenReceiver: &{FungibleToken.Receiver}

    prepare(minterAccount: AuthAccount) {
        self.tokenMinter = minterAccount
            .borrow<&FUSD.MinterProxy>(from: FUSD.MinterProxyStoragePath)
            ?? panic("No minter available")

        self.tokenReceiver = getAccount(to)
            .getCapability(/public/fusdReceiver)!
            .borrow<&{FungibleToken.Receiver}>()
            ?? panic("Unable to borrow receiver reference")
    }

    execute {
        let mintedVault <- self.tokenMinter.mintTokens(amount: amount)
        self.tokenReceiver.deposit(from: <-mintedVault)
    }
}
`,
  setupFusdMinter: `
import FUSD from "../contracts/core/FUSD.cdc"

transaction {
    prepare(minter: AuthAccount) {
        let minterProxy <- FUSD.createMinterProxy()

        minter.save(<- minterProxy,to: FUSD.MinterProxyStoragePath,)
        minter.link<&FUSD.MinterProxy{FUSD.MinterProxyPublic}>(
            FUSD.MinterProxyPublicPath,
            target: FUSD.MinterProxyStoragePath
        )
    }
}
`,
  setupFusdVault: `
import FungibleToken from "../contracts/core/FungibleToken.cdc"
import FUSD from "../contracts/core/FUSD.cdc"

transaction {

  prepare(signer: AuthAccount) {

    // It's OK if the account already has a Vault, but we don't want to replace it
    if(signer.borrow<&FUSD.Vault>(from: /storage/fusdVault) != nil) {
      return
    }

    // Create a new FUSD Vault and put it in storage
    signer.save(<-FUSD.createEmptyVault(), to: /storage/fusdVault)

    // Create a public capability to the Vault that only exposes
    // the deposit function through the Receiver interface
    signer.link<&FUSD.Vault{FungibleToken.Receiver}>(
      /public/fusdReceiver,
      target: /storage/fusdVault
    )

    // Create a public capability to the Vault that only exposes
    // the balance field through the Balance interface
    signer.link<&FUSD.Vault{FungibleToken.Balance}>(
      /public/fusdBalance,
      target: /storage/fusdVault
    )
  }
}
`,
  unlink: `
transaction() {
    prepare(signer: AuthAccount) {
      signer.unlink(%CAPABILITY_PATH%)
    }
}

`,
};
