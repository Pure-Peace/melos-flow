import FungibleToken from "core/FungibleToken.cdc"
import NonFungibleToken from "core/NonFungibleToken.cdc"


pub contract MelosSettlement {

  pub enum ListingType: UInt8 {
    pub case Common
    pub case OpenBid
    pub case DutchAuction
    pub case EnglishAuction
  }

  pub let AdminStoragePath: StoragePath
  pub let ListingManagerStoragePath: StoragePath
  pub let ListingManagerPublicPath: PublicPath

  pub var feeRecipient: Address
  pub var makerRelayerFee: UFix64
  pub var takerRelayerFee: UFix64

  pub var allowedPaymentTokens: [Type]

  pub event MelosSettlementInitialized();
  pub event FeeRecipientChanged(_ newFeeRecipient: Address)

  pub event ListingManagerCreated(_ listingManagerResourceID: UInt64)
  pub event ListingManagerDestroyed(_ listingManagerResourceID: UInt64)

  pub event MakerRelayerFeeChanged(old: UFix64, new: UFix64)
  pub event TakerRelayerFeeChanged(old: UFix64, new: UFix64)

  pub event AllowedPaymentTokensChanged(old: [Type], new: [Type])

  pub event ListingCreated(
    listingType: UInt8,
    seller: Address, 
    listingId: UInt64,
    nftId: UInt64,
    nftType: Type,
    paymentToken: Type,
    listingStartTime: UFix64,
    listingEndTime: UFix64
  )
  pub event ListingRemoved(listingId: UInt64, listingManager: UInt64)
  pub event ListingCompleted(listingId: UInt64, listingManager: UInt64)

  init (
    feeRecipient: Address,
    makerRelayerFee: UFix64,
    takerRelayerFee: UFix64,
    allowedPaymentTokens: [Type]
  ) {
    self.feeRecipient = Address(0x0)
    self.makerRelayerFee = 0.0
    self.takerRelayerFee = 0.0
    self.allowedPaymentTokens = []
    self.AdminStoragePath = /storage/MelosSettlementAdmin
    self.ListingManagerStoragePath = /storage/MelosSettlement
    self.ListingManagerPublicPath = /public/MelosSettlement

    // Create admint resource and do some settings
    let admin <- create Admin()

    admin.setFeeRecipient(feeRecipient)
    admin.setMakerRelayerFee(makerRelayerFee)
    admin.setTakerRelayerFee(takerRelayerFee)
    admin.setAllowedPaymentTokens(allowedPaymentTokens)

    // Save admin resource to account
    self.account.save(<-admin, to: self.AdminStoragePath)

    emit MelosSettlementInitialized()
  }

  pub fun checkListingConfig(_ listingType: ListingType, _ listingConfig: {MelosSettlement.ListingConfig}) {
    var cfg: {MelosSettlement.ListingConfig}? = nil
    switch listingType {
      case ListingType.Common:
        cfg = listingConfig as? Common
      case ListingType.OpenBid:
        cfg = listingConfig as? OpenBid
      case ListingType.DutchAuction:
        cfg = listingConfig as? DutchAuction
      case ListingType.EnglishAuction:
        cfg = listingConfig as? EnglishAuction

      assert(cfg != nil, message: "Invalid listing config")
    }
  }

  pub fun createListingManager(): @ListingManager {
      return <-create ListingManager()
  }

  pub resource Admin {
    pub fun setFeeRecipient(_ newFeeRecipient: Address) {
      MelosSettlement.feeRecipient = newFeeRecipient
      emit FeeRecipientChanged(newFeeRecipient)
    }

    pub fun setMakerRelayerFee(_ newFee: UFix64) {
      let oldFee = MelosSettlement.makerRelayerFee
      MelosSettlement.makerRelayerFee = newFee
      emit MakerRelayerFeeChanged(old: oldFee, new: newFee)
    }

    pub fun setTakerRelayerFee(_ newFee: UFix64) {
      let oldFee = MelosSettlement.takerRelayerFee
      MelosSettlement.takerRelayerFee = newFee
      emit TakerRelayerFeeChanged(old: oldFee, new: newFee)
    }

    pub fun setAllowedPaymentTokens(_ newAllowedPaymentTokens: [Type]) {
      let oldAllowedPaymentTokens = MelosSettlement.allowedPaymentTokens
      MelosSettlement.allowedPaymentTokens = newAllowedPaymentTokens
      emit AllowedPaymentTokensChanged(old: oldAllowedPaymentTokens, new: newAllowedPaymentTokens)
    }
  }

  pub struct interface ListingConfig {

  }

  pub struct Common: ListingConfig {
    pub let price: UFix64

    init (price: UFix64) {
      self.price = price
    }
  }

  pub struct OpenBid: ListingConfig {
    pub let basePrice: UFix64
    pub let minimumBidPercentage: UFix64
    pub let reservePrice: UFix64

    init (
      basePrice: UFix64,
      minimumBidPercentage: UFix64,
      reservePrice: UFix64
    ) {
      self.basePrice = basePrice
      self.minimumBidPercentage = minimumBidPercentage
      self.reservePrice = reservePrice
    }
  }

  pub struct DutchAuction: ListingConfig {
    pub let startingPrice: UFix64
    pub let reservePrice: UFix64

    init (startingPrice: UFix64, reservePrice: UFix64) {
      self.startingPrice = startingPrice
      self.reservePrice = reservePrice
    }
  }

  pub struct EnglishAuction: ListingConfig {
    pub let startingPrice: UFix64 
    pub var currentPrice: UFix64

    init (startingPrice: UFix64) {
      self.startingPrice = startingPrice
      self.currentPrice = startingPrice
    }
  }

  pub struct ListingDetails {
    pub var listingType: ListingType

    pub var listingManagerId: UInt64
    pub var isPurchased: Bool

    pub let nftType: Type
    pub let nftId: UInt64
    pub let paymentToken: Type
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64
    pub let listingConfig: {MelosSettlement.ListingConfig}

    init (
      listingType: ListingType,
      listingManagerId: UInt64,
      nftType: Type,
      nftId: UInt64,
      paymentToken: Type,
      listingStartTime: UFix64,
      listingEndTime: UFix64,
      listingConfig: {MelosSettlement.ListingConfig},
    ) {
      self.listingType = listingType
      self.listingManagerId = listingManagerId
      self.isPurchased = false
      self.nftType = nftType
      self.nftId = nftId
      self.paymentToken = paymentToken
      self.listingStartTime = listingStartTime
      self.listingEndTime = listingEndTime
      self.listingConfig = listingConfig
    }

    access(contract) fun setToPurchased() {
        self.isPurchased = true
    }
  }

  pub resource Listing {
    access(self) var initialized: Bool
    access(self) let details: ListingDetails
    access(contract) let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>

    init(
      listingType: ListingType,
      nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      listingManagerId: UInt64,
      nftType: Type,
      nftId: UInt64,
      paymentToken: Type,
      listingStartTime: UFix64,
      listingEndTime: UFix64,
      listingConfig: {MelosSettlement.ListingConfig}
    ) {
      MelosSettlement.checkListingConfig(listingType, listingConfig)

      self.details = ListingDetails(
        listingType: listingType,
        listingManagerId: listingManagerId,
        nftType: nftType,
        nftId: nftId,
        paymentToken: paymentToken,
        listingStartTime: listingStartTime,
        listingEndTime: listingEndTime,
        listingConfig: listingConfig
      )
      
      self.nftProvider = nftProvider

      // Check that the provider contains the NFT.
      // We will check it again when the token is sold.
      // We cannot move this into a function because initializers cannot call member functions.
      let provider = self.nftProvider.borrow()
      assert(provider != nil, message: "cannot borrow nftProvider")

      // This will precondition assert if the token is not available.
      let nft = provider!.borrowNFT(id: self.details.nftId)
      assert(nft.isInstance(self.details.nftType), message: "token is not of specified type")
      assert(nft.id == self.details.nftId, message: "token does not have specified ID")

      self.initialized = true
      emit ListingCreated(
          listingType: listingType.rawValue,
          seller: self.owner?.address!, 
          listingId: self.uuid,
          nftId: nftId,
          nftType: nftType,
          paymentToken: paymentToken,
          listingStartTime: listingStartTime,
          listingEndTime: listingEndTime
      )
    }

    destroy () {
      if self.initialized {
        if self.details.isPurchased {
          emit ListingCompleted(listingId: self.uuid, listingManager: self.details.listingManagerId)
        } else {
          emit ListingRemoved(listingId: self.uuid, listingManager: self.details.listingManagerId)
        }
      }
    }

    pub fun borrowNFT(): &NonFungibleToken.NFT {
        let ref = self.nftProvider.borrow()!.borrowNFT(id: self.getDetails().nftId)
        assert(ref.isInstance(self.getDetails().nftType), message: "token has wrong type")
        assert(ref.id == self.getDetails().nftId, message: "token has wrong ID")
        return ref
    }

    pub fun getDetails(): ListingDetails {
      return self.details
    }
  }

  pub resource ListingManager {
    // NFT id => Listing id
    access(self) var listedNFTs: {UInt64: UInt64}
    // Listing => Listing resource
    access(self) var listings: @{UInt64: Listing}

    init() {
      self.listedNFTs = {}
      self.listings <- {}

      emit ListingManagerCreated(self.uuid)
    }

    destroy () {
      assert(self.listings.keys.length == 0, message: "There are uncompleted listings")

      destroy self.listings
      emit ListingManagerDestroyed(self.uuid)
    }

    pub fun getListingIds(): [UInt64] {
        return self.listings.keys
    }

    pub fun getListedNFTs(): [UInt64] {
        return self.listedNFTs.keys
    }

    pub fun isListingExists(listingId: UInt64): Bool {
        return self.listings[listingId] != nil
    }

    pub fun isNFTListed(nftId: UInt64): Bool {
        return self.listedNFTs[nftId] != nil
    }

    pub fun getListingIdByNFTId(nftId: UInt64): UInt64 {
        assert(self.listedNFTs[nftId] != nil, message: "NFT not listed")

        return self.listedNFTs[nftId]!
    }

    pub fun getListing(listingId: UInt64): &Listing {
        assert(self.listings[listingId] != nil, message: "Listing not exists")

        return &self.listings[listingId] as! &Listing
    }

    pub fun getListingByNFTId(nftId: UInt64): &Listing {
        return self.getListing(listingId: self.getListingIdByNFTId(nftId: nftId))
    }

    pub fun createListing(
      listingType: ListingType,
      nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      listingManagerId: UInt64,
      nftType: Type,
      nftId: UInt64,
      paymentToken: Type,
      listingStartTime: UFix64,
      listingEndTime: UFix64,
      listingConfig: {MelosSettlement.ListingConfig}
    ): UInt64 {
        assert(MelosSettlement.allowedPaymentTokens.contains(paymentToken) == true, message: "Payment tokens not allowed")

        let listing <- create Listing(
          listingType: listingType,
          nftProvider: nftProvider,
          listingManagerId: listingManagerId,
          nftType: nftType,
          nftId: nftId,
          paymentToken: paymentToken,
          listingStartTime: listingStartTime,
          listingEndTime: listingEndTime,
          listingConfig: listingConfig
        )
        let listingId = listing.uuid

        self.listedNFTs[nftId] = listingId
        let _ <- self.listings[listingId] <- listing
        destroy _

        return listingId
    }

    pub fun removeListing(listingId: UInt64) {
        assert(self.listings[listingId] != nil, message: "Listing not exists")

        let listing <- self.listings.remove(key: listingId)!
        let nftId = listing.getDetails().nftId

        self.listedNFTs.remove(key: nftId)
        destroy listing
    }

    pub fun completeListing(listingId: UInt64) {
        assert(self.listings[listingId] != nil, message: "Listing not exists")

        let listing <- self.listings.remove(key: listingId)!
        let details = listing.getDetails()

        assert(details.isPurchased == true, message: "Listing is not purchased")
        self.listedNFTs.remove(key: details.nftId)
        destroy listing
    }
  }
}