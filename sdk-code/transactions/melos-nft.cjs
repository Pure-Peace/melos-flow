module.exports = {
  batchMint: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// This transction uses the Admin resource to mint amount of new Melos NFT.
//
// It must be run with the account that has the Admin resource
// stored at path /storage/melosNFTAdmin.

transaction(amounts: [UInt64], recipients: [Address]) {
    // local variable for storing the admin reference
    let admin: &MelosNFT.Admin
    prepare(signer: AuthAccount) {
      assert(recipients.length == amounts.length, message: "Invalid mint array length")

      // borrow a reference to the Admin resource in storage
      self.admin = signer.borrow<&MelosNFT.Admin>(from: MelosNFT.AdminStoragePath)
          ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {
      var i = 0
      while i < recipients.length {
        // borrow the recipient's public NFT collection reference
        let receiver = getAccount(recipients[i])
            .getCapability<&{NonFungibleToken.CollectionPublic}>(MelosNFT.CollectionPublicPath)
        self.admin.mint(recipient: receiver, amount: amounts[i])
        i = i + 1
      }
    }
}

`,
  batchTransfer: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


transaction(tokenIds: [UInt64], recipients: [Address]) {
    let collection: &MelosNFT.Collection
    prepare(acct: AuthAccount) {
      assert(recipients.length == tokenIds.length, message: "Invalid transfer array length")

      self.collection = acct.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath)
          ?? panic("Missing NFT collection on signer account")
    }

    execute {
      var i = 0
      while i < recipients.length {
        let receiver = getAccount(recipients[i])
          .getCapability<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath)
        receiver.borrow()!.deposit(token: <- self.collection.withdraw(withdrawID: tokenIds[i]))
        i = i + 1
      }
    }
}
`,
  burn: `
import MelosNFT from "../../contracts/MelosNFT.cdc"


// Burn MelosNFT on signer account by tokenId
//
transaction(nftId: UInt64) {
    prepare(account: AuthAccount) {
      let collection = account.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath)!
      collection.burn(nftId: nftId)
    }
}
`,
  mint: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// This transction uses the Admin resource to mint a new Melos NFT.
//
// It must be run with the account that has the Admin resource
// stored at path /storage/melosNFTAdmin.

transaction(recipient: Address, amount: UInt64) {

    // local variable for storing the admin reference
    let admin: &MelosNFT.Admin

    prepare(signer: AuthAccount) {

        // borrow a reference to the Admin resource in storage
        self.admin = signer.borrow<&MelosNFT.Admin>(from: MelosNFT.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {
        // get the public account object for the recipient
        let recipient = getAccount(recipient)

        // borrow the recipient's public NFT collection reference
        let receiver = recipient
            .getCapability<&{NonFungibleToken.CollectionPublic}>(MelosNFT.CollectionPublicPath)

        // mint the NFT and deposit it to the recipient's collection
        self.admin.mint(recipient: receiver, amount: amount)
    }
}

`,
  removeCollection: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


transaction {
    prepare(acct: AuthAccount) {
      let collection <- acct.load<@AnyResource>(from: MelosNFT.CollectionStoragePath)
      destroy collection
    }
}
`,
  setupCollection: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


// Setup storage for MelosNFT on signer account
//
transaction {
    prepare(acct: AuthAccount) {
        if acct.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath) == nil {
            let collection <- MelosNFT.createEmptyCollection() as! @MelosNFT.Collection
            acct.save(<-collection, to: MelosNFT.CollectionStoragePath)
            acct.link<&{NonFungibleToken.CollectionPublic, NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath, target: MelosNFT.CollectionStoragePath)
        }
    }
}
`,
  transfer: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"


// transfer MelosNFT token with tokenId to given address
//
transaction(recipient: Address, nftId: UInt64) {
    let token: @NonFungibleToken.NFT
    let receiver: Capability<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>

    prepare(acct: AuthAccount) {
        let collection = acct.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath)
            ?? panic("Missing NFT collection on signer account")
        self.token <- collection.withdraw(withdrawID: nftId)
        self.receiver = getAccount(recipient).getCapability<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath)
    }

    execute {
        let receiver = self.receiver.borrow()!
        receiver.deposit(token: <- self.token)
    }
}
`,
};
