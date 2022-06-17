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
