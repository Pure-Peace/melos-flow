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
  }

  pub resource Listing {
    access(self) let details: ListingDetails
    access(contract) let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>

    destroy () {

    }

    pub fun getDetails(): ListingDetails {
      return self.details
    }



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
    }
  }

  pub resource ListingManager {
    access(self) var listedNFTs: [UInt64]
    access(self) var listings: @{UInt64: Listing}

    destroy () {
      destroy self.listings

      emit ListingManagerDestroyed(self.uuid)
    }

    init() {
      self.listedNFTs = []
      self.listings <- {}

      emit ListingManagerCreated(self.uuid)
    }
  }
}