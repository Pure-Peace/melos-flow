import NonFungibleToken from "core/NonFungibleToken.cdc"

pub contract MelosNFT: NonFungibleToken {

    pub var totalSupply: UInt64
    pub var baseMetadataURI: String

    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)

    pub event Minted(id: UInt64, recipient: Address)

    pub event MetadataBaseURIChanged(baseMetadataURI: String)

    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let AdminStoragePath: StoragePath

    pub resource NFT: NonFungibleToken.INFT {
        pub let id: UInt64

        init(id: UInt64) {
            self.id = id
        }

        pub fun getMetadata(): String {
          return MelosNFT.baseMetadataURI.concat(self.id.toString())
        }

    }

    pub resource interface MelosNFTCollectionPublic {
        pub fun deposit(token: @NonFungibleToken.NFT)
        pub fun getIDs(): [UInt64]
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
        pub fun borrowMelosNFT(id: UInt64): &MelosNFT.NFT? {
            post {
                (result == nil) || (result?.id == id):
                    "Cannot borrow MelosNFT reference: the ID of the returned reference is incorrect"
            }
        }
    }

    pub resource Collection: MelosNFTCollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic {
        // dictionary of NFT conforming tokens
        // NFT is a resource type with an `UInt64` ID field
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        init () {
            self.ownedNFTs <- {}
        }

        // withdraw removes an NFT from the collection and moves it to the caller
        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")

            emit Withdraw(id: token.id, from: self.owner?.address)

            return <-token
        }

        pub fun burn(nftId: UInt64) {
          destroy self.withdraw(withdrawID: nftId)
          MelosNFT.totalSupply = MelosNFT.totalSupply - 1
        }

        // deposit takes a NFT and adds it to the collections dictionary
        // and adds the ID to the id array
        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @MelosNFT.NFT

            let id: UInt64 = token.id

            // add the new token to the dictionary which removes the old one
            let oldToken <- self.ownedNFTs[id] <- token

            emit Deposit(id: id, to: self.owner?.address)

            destroy oldToken
        }

        // getIDs returns an array of the IDs that are in the collection
        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        // borrowNFT gets a reference to an NFT in the collection
        // so that the caller can read its metadata and call its methods
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
        }
 
        pub fun borrowMelosNFT(id: UInt64): &MelosNFT.NFT? {
            if self.ownedNFTs[id] != nil {
                // Create an authorized reference to allow downcasting
                let ref = &self.ownedNFTs[id] as auth &NonFungibleToken.NFT?
                return ref as! &MelosNFT.NFT
            }

            return nil
        }

        pub fun getMetadata(id: UInt64): String {
            let ref = &self.ownedNFTs[id] as auth &NonFungibleToken.NFT?
            return (ref as! &MelosNFT.NFT).getMetadata()
        }

        destroy() {
            destroy self.ownedNFTs
        }
    }

    // public function that anyone can call to create a new empty collection
    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        return <- create Collection()
    }

    // Administrative resource that only the contract deployer has access to
    // - to mint new NFTs
    // - set baseMetadataURI
    pub resource Admin {

        // Mints a new NFT
        // and deposit it in the recipients collection using their collection reference
        pub fun mintTo(recipient: Capability<&{NonFungibleToken.CollectionPublic}>): &NonFungibleToken.NFT {
            // create a new NFT
            let token <- create NFT(id: MelosNFT.totalSupply)
            MelosNFT.totalSupply = MelosNFT.totalSupply + 1
            let tokenRef = &token as &NonFungibleToken.NFT
            emit Minted(id: token.id, recipient: recipient.address)
            
            let receiver = recipient.borrow() ?? panic("Could not get receiver reference to the NFT Collection") 
            receiver.deposit(token: <-token)
            return tokenRef
        }

        pub fun setBaseMetadataURI(baseMetadataURI: String) {
            MelosNFT.baseMetadataURI = baseMetadataURI
            emit MetadataBaseURIChanged(baseMetadataURI: baseMetadataURI)
        }
    }


    init(baseMetadataURI: String) {
        // Initialize the total supply
        self.totalSupply = 0

        self.baseMetadataURI = baseMetadataURI

        // Set the named paths
        self.CollectionStoragePath = /storage/melosNFTCollection
        self.CollectionPublicPath = /public/melosNFTCollection
        self.AdminStoragePath = /storage/melosNFTAdmin

        // Create a Collection resource and save it to storage
        let collection <- create Collection()
        self.account.save(<-collection, to: self.CollectionStoragePath)

        // create a public capability for the collection
        self.account.link<&MelosNFT.Collection{NonFungibleToken.CollectionPublic, MelosNFT.MelosNFTCollectionPublic}>(
            self.CollectionPublicPath,
            target: self.CollectionStoragePath
        )

        // Create a Admin resource and save it to storage
        let admin <- create Admin()
        self.account.save(<-admin, to: self.AdminStoragePath)

        emit ContractInitialized()
    }
}