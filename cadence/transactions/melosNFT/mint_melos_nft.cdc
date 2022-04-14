import NonFungibleToken from "../../contracts/NonFungibleToken.cdc"
import MelosNFT from "../../contracts/MelosNFT.cdc"

// This transction uses the Admin resource to mint a new Melos NFT.
//
// It must be run with the account that has the Admin resource
// stored at path /storage/melosNFTAdmin.

transaction(recipient: Address, name: String, description: String, thumbnail: String) {

    // local variable for storing the admin reference
    let admin: &MelosNFT.Admin

    prepare(signer: AuthAccount) {

        // borrow a reference to the Admin resource in storage
        self.admin = signer.borrow<&MelosNFT.Admin>(from: MelosNFT.MinterStoragePath)
            ?? panic("Could not borrow a reference to the NFT minter")
    }

    execute {
        // get the public account object for the recipient
        let recipient = getAccount(recipient)

        // borrow the recipient's public NFT collection reference
        let receiver = recipient
            .getCapability(MelosNFT.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")

        // mint the NFT and deposit it to the recipient's collection
        self.admin.mintNFT(recipient: receiver)
    }
}
