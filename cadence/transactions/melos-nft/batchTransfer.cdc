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