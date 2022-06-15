module.exports = {
  batchMint: `
import NonFungibleToken from "../../contracts/core/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// This transction uses the Admin resource to mint a new Melos NFT.
//
// It must be run with the account that has the Admin resource
// stored at path /storage/melosNFTAdmin.

transaction(amount: Int, recipient: Address) {

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
        var i = 0
        while i < amount {
          i = i + 1
          self.admin.mintTo(recipient: receiver)
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

transaction(recipient: Address) {

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
        self.admin.mintTo(recipient: receiver)
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
transaction(tokenId: UInt64, to: Address) {
    let token: @NonFungibleToken.NFT
    let receiver: Capability<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>

    prepare(acct: AuthAccount) {
        let collection = acct.borrow<&MelosNFT.Collection>(from: MelosNFT.CollectionStoragePath)
            ?? panic("Missing NFT collection on signer account")
        self.token <- collection.withdraw(withdrawID: tokenId)
        self.receiver = getAccount(to).getCapability<&{NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver}>(MelosNFT.CollectionPublicPath)
    }

    execute {
        let receiver = self.receiver.borrow()!
        receiver.deposit(token: <- self.token)
    }
}
`,
};
