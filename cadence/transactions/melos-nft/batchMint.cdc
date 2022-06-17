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
