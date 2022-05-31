import FungibleToken from "core/FungibleToken.cdc"
import NonFungibleToken from "core/NonFungibleToken.cdc"


pub contract MelosMarketplace {

  pub enum ListingType: UInt8 {
    pub case Common
    pub case OpenBid
    pub case DutchAuction
    pub case EnglishAuction
  }

  /* --------------- ↓↓ Vars ↓↓ --------------- */

  pub let AdminStoragePath: StoragePath
  pub let ListingManagerStoragePath: StoragePath
  pub let BidManagerStoragePath: StoragePath

  pub var feeRecipient: Address?
  pub var makerRelayerFee: UFix64?
  pub var takerRelayerFee: UFix64?
  pub var minimumListingDuration: UFix64?
  pub var maxAuctionDuration: UFix64?

  access(self) let listings: @{UInt64: Listing}
  access(self) var allowedPaymentTokens: [Type]

  /* --------------- ↓↓ Events ↓↓ --------------- */

  pub event MelosSettlementInitialized();
  pub event FeeRecipientChanged(_ newFeeRecipient: Address?)

  pub event ListingManagerCreated(_ listingManagerResourceID: UInt64)
  pub event ListingManagerDestroyed(_ listingManagerResourceID: UInt64)

  pub event MakerRelayerFeeChanged(old: UFix64?, new: UFix64?)
  pub event TakerRelayerFeeChanged(old: UFix64?, new: UFix64?)
  pub event MinimumListingDurationChanged(old: UFix64?, new: UFix64?)
  pub event MaxAuctionDurationChanged(old: UFix64?, new: UFix64?)
  pub event AllowedPaymentTokensChanged(old: [Type]?, new: [Type]?)

  pub event OpenBidCreated(listingId: UInt64, bidId: UInt64, bidder: Address, offerPrice: UFix64)
  pub event OpenBidRemoved(listingId: UInt64, bidId: UInt64)

  pub event EnglishAuctionBidCreated(listingId: UInt64, bidId: UInt64, bidder: Address, offerPrice: UFix64)
  pub event EnglishAuctionBidRemoved(listingId: UInt64, bidId: UInt64)

  pub event ListingCreated(
    listingType: UInt8,
    seller: Address, 
    listingId: UInt64,
    nftId: UInt64,
    nftType: Type,
    paymentToken: Type,
    listingStartTime: UFix64,
    listingEndTime: UFix64?
  )
  pub event ListingRemoved(purchased: Bool, listingId: UInt64, listingManager: UInt64)
  pub event ListingCompleted(listingId: UInt64, listingManager: UInt64)

  /* --------------- ↓↓ Initilization ↓↓ --------------- */

  init (
    feeRecipient: Address?,
    makerRelayerFee: UFix64?,
    takerRelayerFee: UFix64?,
    minimumListingDuration: UFix64?,
    maxAuctionDuration: UFix64?,
    allowedPaymentTokens: [Type]
  ) {
    self.feeRecipient = nil
    self.makerRelayerFee = nil
    self.takerRelayerFee = nil
    self.minimumListingDuration = nil
    self.maxAuctionDuration = nil

    self.listings <- {}
    self.allowedPaymentTokens = []

    self.AdminStoragePath = /storage/MelosSettlementAdmin
    self.ListingManagerStoragePath = /storage/MelosMarketplace
    self.BidManagerStoragePath = /storage/MelosBidManager

    // Create admint resource and do some settings
    let admin <- create Admin()

    admin.setFeeRecipient(feeRecipient)
    admin.setMakerRelayerFee(makerRelayerFee)
    admin.setTakerRelayerFee(takerRelayerFee)
    admin.setMinimumListingDuration(minimumListingDuration)
    admin.setMaxAuctionDuration(maxAuctionDuration)
    admin.setAllowedPaymentTokens(allowedPaymentTokens)

    // Save admin resource to account
    self.account.save(<-admin, to: self.AdminStoragePath)

    emit MelosSettlementInitialized()
  }

  /* --------------- ↓↓ Contract Methods ↓↓ --------------- */

  pub fun getListingIds(): [UInt64] {
      return self.listings.keys
  }

  pub fun isListingExists(_ listingId: UInt64): Bool {
      return self.listings[listingId] != nil
  }

  pub fun getListing(_ listingId: UInt64): &Listing? {
      return &self.listings[listingId] as? &Listing
  }

  pub fun getListingDetails(_ listingId: UInt64): ListingDetails? {
      return MelosMarketplace.getListing(listingId)?.getDetails()
  }

  pub fun getAllowedPaymentTokens(): [Type] {
    return MelosMarketplace.allowedPaymentTokens
  }

  pub fun isTokenAllowed(_ token: Type): Bool {
    return MelosMarketplace.allowedPaymentTokens.contains(token)
  }

  pub fun checkListingConfig(_ listingType: ListingType, _ listingConfig: {MelosMarketplace.ListingConfig}) {
    var cfg: {MelosMarketplace.ListingConfig}? = nil
    switch listingType {
      case ListingType.Common:
        cfg = listingConfig as? Common
        break
      case ListingType.OpenBid:
        cfg = listingConfig as? OpenBid
        break
      case ListingType.DutchAuction:
        cfg = listingConfig as? DutchAuction
        break
      case ListingType.EnglishAuction:
        cfg = listingConfig as? EnglishAuction
        break
    }
    assert(cfg != nil, message: "Invalid listing config")
  }

  pub fun createListingManager(): @ListingManager {
      return <-create ListingManager()
  }

  pub fun createBidManager(): @BidManager {
      return <-create BidManager()
  }

  /* --------------- ↑↑ Contract Methods ↑↑ --------------- */

  /* --------------- ↓↓ Contract Admint ↓↓ --------------- */

  pub resource Admin {
    pub fun setFeeRecipient(_ newFeeRecipient: Address?) {
      MelosMarketplace.feeRecipient = newFeeRecipient
      emit FeeRecipientChanged(newFeeRecipient)
    }

    pub fun setMakerRelayerFee(_ newFee: UFix64?) {
      let oldFee = MelosMarketplace.makerRelayerFee
      MelosMarketplace.makerRelayerFee = newFee
      emit MakerRelayerFeeChanged(old: oldFee, new: newFee)
    }

    pub fun setTakerRelayerFee(_ newFee: UFix64?) {
      let oldFee = MelosMarketplace.takerRelayerFee
      MelosMarketplace.takerRelayerFee = newFee
      emit TakerRelayerFeeChanged(old: oldFee, new: newFee)
    }

    pub fun setMinimumListingDuration(_ newDuration: UFix64?) {
      let oldDuration = MelosMarketplace.minimumListingDuration
      MelosMarketplace.minimumListingDuration = newDuration
      emit MinimumListingDurationChanged(old: oldDuration, new: newDuration)
    }

    pub fun setMaxAuctionDuration(_ newDuration: UFix64?) {
      let oldDuration = MelosMarketplace.maxAuctionDuration
      MelosMarketplace.maxAuctionDuration = newDuration
      emit MaxAuctionDurationChanged(old: oldDuration, new: newDuration)
    }

    pub fun setAllowedPaymentTokens(_ newAllowedPaymentTokens: [Type]) {
      let oldAllowedPaymentTokens = MelosMarketplace.allowedPaymentTokens
      MelosMarketplace.allowedPaymentTokens = newAllowedPaymentTokens
      emit AllowedPaymentTokensChanged(old: oldAllowedPaymentTokens, new: newAllowedPaymentTokens)
    }

    pub fun addAllowedPaymentTokens(_ newAllowedPaymentTokens: [Type]) {
      self.setAllowedPaymentTokens(MelosMarketplace.allowedPaymentTokens.concat(newAllowedPaymentTokens))
    }

    pub fun removeAllowedPaymentTokens(_ removedPaymentTokens: [Type]) {
      let temp = MelosMarketplace.allowedPaymentTokens
      for index, token in MelosMarketplace.allowedPaymentTokens {
        if temp.contains(token) {
          temp.remove(at: index)
        }
      }
      self.setAllowedPaymentTokens(temp)
    }
  }

  /* --------------- ↑↑ Contract Admin ↑↑ --------------- */

  /* --------------- ↓↓ ListingConfigs ↓↓ --------------- */

  pub struct interface ListingConfig {
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64?
    pub fun getPrice(): UFix64
  }

  pub struct Common: ListingConfig {
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64?

    pub let price: UFix64

    init (listingStartTime: UFix64, listingEndTime: UFix64?, price: UFix64) {
      if listingEndTime != nil {
        assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
        assert((listingEndTime! - listingStartTime) > MelosMarketplace.minimumListingDuration ?? 0.0, message: "Listing duration must be greater than minimum listing duration")
      }
      self.listingStartTime = listingStartTime
      self.listingEndTime = listingEndTime

      self.price = price
    }

    pub fun getPrice(): UFix64 {
      return self.price
    }
  }

  pub struct OpenBid: ListingConfig {
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64?
    
    pub let minimumPrice: UFix64

    init (listingStartTime: UFix64, listingEndTime: UFix64?, minimumPrice: UFix64) {
      if listingEndTime != nil {
        assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
        assert((listingEndTime! - listingStartTime) > MelosMarketplace.minimumListingDuration ?? 0.0, message: "Listing duration must be greater than minimum listing duration")
      }
      self.listingStartTime = listingStartTime
      self.listingEndTime = listingEndTime

      self.minimumPrice = minimumPrice
    }

    pub fun getPrice(): UFix64 {
      return self.minimumPrice
    }
  }

  pub struct DutchAuction: ListingConfig {
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64?
    
    pub let startingPrice: UFix64
    pub let reservePrice: UFix64
    pub let priceCutInterval: UFix64

    init (
      listingStartTime: UFix64, 
      listingEndTime: UFix64?, 
      startingPrice: UFix64, 
      reservePrice: UFix64, 
      priceCutInterval: UFix64
    ) {
      assert(startingPrice >= reservePrice, message: "Starting price must be greater than or equal with reserve price")
      assert(listingEndTime != nil, message: "Dutch auction listingEndTime must not null")
      assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
      assert((listingEndTime! - listingStartTime) > MelosMarketplace.minimumListingDuration ?? 0.0, message: "Listing duration must be greater than minimum listing duration")
      assert(priceCutInterval < (listingStartTime - listingEndTime!), message: "Dutch auction priceCutInterval must be less than listing duration")

      self.listingStartTime = listingStartTime
      self.listingEndTime = listingEndTime

      self.startingPrice = startingPrice
      self.reservePrice = reservePrice
      self.priceCutInterval = priceCutInterval
    }

    pub fun getPrice(): UFix64 {
      let duration = getCurrentBlock().timestamp - self.listingStartTime

      let diff = self.startingPrice - self.reservePrice
      let deduct = (duration - duration % self.priceCutInterval)
         * diff / (self.listingEndTime! - self.listingStartTime - self.priceCutInterval)
      
      return deduct > diff ? self.reservePrice : self.reservePrice - deduct
    }
  }

  pub struct EnglishAuction: ListingConfig {
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64?
    
    pub let reservePrice: UFix64
    pub let minimumBidPercentage: UFix64

    pub var currentPrice: UFix64
    pub var topBid: UInt64?

    init (
      listingStartTime: UFix64, 
      listingEndTime: UFix64?, 
      reservePrice: UFix64,
      minimumBidPercentage: UFix64,
      currentPrice: UFix64
    ) {
      assert(reservePrice >= currentPrice, message: "Reserve price must be greater than or equal with current price")
      assert(listingEndTime != nil, message: "English auction listingEndTime must not null")
      assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
      assert((listingEndTime! - listingStartTime) > MelosMarketplace.minimumListingDuration ?? 0.0, message: "Listing duration must be greater than minimum listing duration")
      if let maxAuctionDuration = MelosMarketplace.maxAuctionDuration {
        assert((listingEndTime! - listingStartTime) <= maxAuctionDuration, message: "Auction duration must be less than max auction duration")
      }

      self.listingStartTime = listingStartTime
      self.listingEndTime = listingEndTime

      self.reservePrice = reservePrice
      self.minimumBidPercentage = minimumBidPercentage

      self.currentPrice = currentPrice
      self.topBid = nil
    }

    pub fun getPrice(): UFix64 {
      return self.currentPrice
    }

    pub fun getNextBidMinimumPrice(): UFix64 {
      return self.getPrice() * (1.0 + self.minimumBidPercentage)
    }

    access(contract) fun setTopBid(newTopBid: &Bid) {
      assert(newTopBid.offerPrice() >= self.getNextBidMinimumPrice(), message: "Offer price must be greater than or equal with [CurrentPrice * (1 + Minimum bid percentage)]")
      self.topBid = newTopBid.uuid
      self.currentPrice = newTopBid.offerPrice()
    }
  }

  /* --------------- ↑↑ ListingConfigs ↑↑ --------------- */

  /* --------------- ↓↓ Bids ↓↓ --------------- */

  pub resource Bid {
    access(contract) let bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>
    access(contract) let rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>
    access(contract) let refund: Capability<&{FungibleToken.Receiver}>
    access(contract) let payment: @FungibleToken.Vault

    pub let listingId: UInt64
    pub let bidder: Address
    access(contract) var bidTimestamp: UFix64

    init(
      bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
      listingId: UInt64,
      rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ) {
      assert(bidManager.check(), message: "Invalid bidManager")
      assert(rewardCollection.check(), message: "Invalid NFT reward collection")
      assert(refund.check(), message: "Invalid refund capability")

      self.bidManager = bidManager
      self.bidManager.borrow()!.recordBid(listingId: listingId, bidId: self.uuid)

      self.listingId = listingId

      self.rewardCollection = rewardCollection
      self.refund = refund
      self.payment <- payment

      self.bidder = self.refund.address
      self.bidTimestamp = getCurrentBlock().timestamp
    }

    pub fun offerPrice(): UFix64 {
      return self.payment.balance
    }

    pub fun bidTime(): UFix64 {
      return self.bidTimestamp
    }

    destroy() {
      self.refund.borrow()!.deposit(from: <- self.payment)
    }
  }


  pub resource interface BidManagerPublic {
    pub fun isBidExists(listingId: UInt64, bidId: UInt64): Bool 

    pub fun getRecords(): {UInt64: [UInt64]}

    pub fun getBidsWithListingId(listingId: UInt64): [UInt64]

    pub fun recordBid(listingId: UInt64, bidId: UInt64): Bool
  }

  pub resource BidManager: BidManagerPublic {
    // ListingId => [BidId]
    access(self) let listings: {UInt64: [UInt64]}

    init () {
      self.listings = {}
    }

    pub fun isBidExists(listingId: UInt64, bidId: UInt64): Bool {      
      if self.listings[listingId] == nil {
        return false

      } else if self.listings[listingId]!.contains(bidId) {
        return true
      }

      return false
    }

    pub fun getRecords(): {UInt64: [UInt64]} {
      return self.listings
    }

    pub fun getBidsWithListingId(listingId: UInt64): [UInt64] {
      return self.listings[listingId] ?? []
    }

    pub fun recordBid(listingId: UInt64, bidId: UInt64): Bool {
      if self.listings[listingId] == nil {
        self.listings[listingId] = [bidId]
        return true

      } else if !self.listings[listingId]!.contains(bidId) {
        self.listings[listingId]!.append(bidId)
        return true
      }

      return false
    }

    destroy() {
      for bids in self.listings.values {
        assert(bids.length == 0, message: "Bid records exists")
      }
    }
  }

  /* --------------- ↑↑ Bids ↑↑ --------------- */

  /* --------------- ↓↓ Listings ↓↓ --------------- */

  pub struct ListingDetails {
    pub let listingType: ListingType
    pub let listingManagerId: UInt64

    pub let nftType: Type
    pub let nftId: UInt64
    pub let paymentToken: Type
    pub let listingConfig: {MelosMarketplace.ListingConfig}
    pub let receiver: Capability<&{FungibleToken.Receiver}>

    pub var isPurchased: Bool

    init (
      listingType: ListingType,
      listingManagerId: UInt64,
      nftType: Type,
      nftId: UInt64,
      paymentToken: Type,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>
    ) {
      self.listingType = listingType
      self.listingManagerId = listingManagerId
      self.isPurchased = false
      self.nftType = nftType
      self.nftId = nftId
      self.paymentToken = paymentToken
      self.listingConfig = listingConfig
      self.receiver = receiver
    }

    pub fun getPrice(): UFix64 {
      return self.listingConfig.getPrice()
    }

    access(contract) fun setToPurchased() {
        self.isPurchased = true
    }
  }

  pub resource Listing {
    access(self) let initialized: Bool
    access(self) let details: ListingDetails
    access(self) let nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>

    // Open bid id => Bid
    access(self) let openBids: @{UInt64: Bid}

    // Address => English auction bid id
    access(self) var englishAuctionParticipant: {Address: UInt64}
    // English auction bid id => Bid
    access(self) let englishAuctionBids: @{UInt64: Bid}

    init(
      listingType: ListingType,
      nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      listingManagerId: UInt64,
      nftType: Type,
      nftId: UInt64,
      paymentToken: Type,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>
    ) {
      MelosMarketplace.checkListingConfig(listingType, listingConfig)
      assert(MelosMarketplace.isTokenAllowed(paymentToken), message: "Payment tokens not allowed")
      assert(receiver.borrow() != nil, message: "Cannot borrow receiver")

      let provider = nftProvider.borrow()
      assert(provider != nil, message: "cannot borrow nftProvider")

      // This will precondition assert if the token is not available.
      let nft = provider!.borrowNFT(id: nftId)
      assert(nft.isInstance(nftType), message: "token is not of specified type")
      assert(nft.id == nftId, message: "token does not have specified id")

      self.details = ListingDetails(
        listingType: listingType,
        listingManagerId: listingManagerId,
        nftType: nftType,
        nftId: nftId,
        paymentToken: paymentToken,
        listingConfig: listingConfig,
        receiver: receiver
      )
      self.nftProvider = nftProvider
      self.openBids <- {}
      self.englishAuctionParticipant = {}
      self.englishAuctionBids <- {}
      self.initialized = true
      
      emit ListingCreated(
          listingType: listingType.rawValue,
          seller: self.owner?.address!, 
          listingId: self.uuid,
          nftId: nftId,
          nftType: nftType,
          paymentToken: paymentToken,
          listingStartTime: listingConfig.listingStartTime,
          listingEndTime: listingConfig.listingEndTime
      )
    }

    destroy () {
      if self.initialized {
        emit ListingRemoved(
            purchased: self.details.isPurchased, 
            listingId: self.uuid, 
            listingManager: self.details.listingManagerId
          )
      }
      destroy self.openBids
      destroy self.englishAuctionBids
    }

    pub fun borrowNFT(): &NonFungibleToken.NFT {
        let nft = self.nftProvider.borrow()!.borrowNFT(id: self.details.nftId)
        assert(nft.isInstance(self.details.nftType), message: "token has wrong type")
        assert(nft.id == self.details.nftId, message: "token has wrong ID")
        return nft
    }

    pub fun getEnglishAuctionParticipants(): {Address: UInt64} {
      return self.englishAuctionParticipant
    }

    pub fun getBid(bidId: UInt64): &Bid? {
      return &self.openBids[bidId] as? &Bid
    }

    pub fun getDetails(): ListingDetails {
      return self.details
    }

    pub fun getPrice(): UFix64 {
      return self.details.getPrice()
    }

    pub fun isListingEnded(): Bool {
      return self.details.listingConfig.listingEndTime != nil 
        ? getCurrentBlock().timestamp < self.details.listingConfig.listingEndTime! 
        : false
    }

    pub fun isListingStarted(): Bool {
      return getCurrentBlock().timestamp >= self.details.listingConfig.listingStartTime
    }

    pub fun isPurchased(): Bool {
      return self.details.isPurchased == false
    }

    pub fun ensureAvaliable() {
      assert(!self.isPurchased(), message: "Listing has already been purchased")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(!self.isListingEnded(), message: "Listing has ended")
    }

    pub fun ensurePaymentTokenType(_ payment: @FungibleToken.Vault): @FungibleToken.Vault {
      assert(payment.isInstance(self.details.paymentToken), message: "payment vault is not requested fungible token")
      return <- payment
    }

    access(self) fun withdrawNFT(): @NonFungibleToken.NFT {
      // Make sure the listing cannot be purchased again.
      self.details.setToPurchased()
  
      let nft <-self.nftProvider.borrow()!.withdraw(withdrawID: self.details.nftId)

      // **MUST** check nft
      assert(nft.isInstance(self.details.nftType), message: "withdrawn NFT is not of specified type")
      assert(nft.id == self.details.nftId, message: "withdrawn NFT does not have specified Id")
      return <- nft
    }

    access(self) fun completeListing(_ payment: @FungibleToken.Vault): @NonFungibleToken.NFT {
      let nft <- self.withdrawNFT()

      // TODO: Deducting royalties or fees
      // payment.withdraw(amount: fees)

      // Deposit the remaining amount after deducting fees and royalties to the beneficiary.
      self.details.receiver.borrow()!.deposit(from: <- payment)

      emit ListingCompleted(listingId: self.uuid, listingManager: self.details.listingManagerId)

      return <- nft
    }

    pub fun purchaseCommon(payment: @FungibleToken.Vault): @NonFungibleToken.NFT {
      // Check listing and params
      assert(self.details.listingType == ListingType.Common, message: "Listing type is not Common")
      self.ensureAvaliable()

      let payment <- self.ensurePaymentTokenType(<- payment)
      let price = self.getPrice()
      assert(payment.balance >= price, message: "insufficient payments")

      return <- self.completeListing(<- payment)
    }

    pub fun purchaseDutchAuction(payment: @FungibleToken.Vault): @NonFungibleToken.NFT {
      // Check listing and params
      assert(self.details.listingType == ListingType.DutchAuction, message: "Listing type is not DutchAuction")
      self.ensureAvaliable()

      let payment <- self.ensurePaymentTokenType(<- payment)
      let price = self.getPrice()
      assert(payment.balance >= price, message: "insufficient payments")

      return <- self.completeListing(<- payment)
    }

    pub fun openBid(
      bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      // Check listing and params
      assert(self.details.listingType == ListingType.OpenBid, message: "Listing type is not OpenBid")
      self.ensureAvaliable()

      let payment <- self.ensurePaymentTokenType(<- payment)
      let offerPrice = payment.balance
      assert(offerPrice >= (self.details.listingConfig as! OpenBid).minimumPrice, message: "Offer price must be greater than minimumPrice")

      let bid <- create Bid(
        bidManager: bidManager,
        listingId: self.uuid,
        rewardCollection: rewardCollection,
        refund: refund,
        payment: <- payment
      )
      let bidId = bid.uuid

      let _ <- self.openBids[bidId] <- bid
      destroy _;

      emit OpenBidCreated(listingId: self.uuid, bidId: bidId, bidder: refund.address, offerPrice: offerPrice)

      return bidId
    }

    pub fun bidEnglishAuction(
      bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      // Check listing and params
      assert(self.details.listingType == ListingType.EnglishAuction, message: "Listing type is not EnglishAuction")
      self.ensureAvaliable()
      
      let payment <- self.ensurePaymentTokenType(<- payment)

      // Already exists handle
      if let oldBidId = self.englishAuctionParticipant[refund.address] {
        let oldBid <- self.englishAuctionBids.remove(key: oldBidId)!
        payment.deposit(from: <- oldBid.payment.withdraw(amount: oldBid.payment.balance))
        destroy oldBid
      }

      let offerPrice = payment.balance

      let bid <- create Bid(
        bidManager: bidManager,
        listingId: self.uuid,
        rewardCollection: rewardCollection,
        refund: refund,
        payment: <- payment
      )
      let bidRef = &bid as &Bid
      let bidId = bid.uuid

      let _ <- self.englishAuctionBids[bidId] <- bid
      destroy _;

      (self.details.listingConfig as! EnglishAuction).setTopBid(newTopBid: bidRef)

      emit EnglishAuctionBidCreated(
        listingId: self.uuid, 
        bidId: bidId,
        bidder: refund.address, 
        offerPrice: offerPrice
      )

      return bidId
    }

    pub fun completeEnglishAuction() {
      // Check listing and params
      assert(self.details.listingType == ListingType.EnglishAuction, message: "Listing type is not EnglishAuction")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(self.isListingEnded(), message: "Auction is not ended")
      assert(!self.isPurchased(), message: "Listing has already been purchased")

      let topBid <- self.openBids.remove(key: (self.details.listingConfig as! EnglishAuction).topBid ?? panic("No bids"))!
      
      let nft <- self.completeListing(<- topBid.payment.withdraw(amount: topBid.payment.balance))
      topBid.rewardCollection.borrow()!.deposit(token: <- nft)

      destroy topBid

      for key in self.englishAuctionBids.keys {
        let bid <- self.englishAuctionBids.remove(key: key)
        destroy bid
      }

      self.englishAuctionParticipant = {}
    }
  }

  pub resource ListingManager {
    // Listing => Listing resource
    pub let listings: {UInt64: &Listing}

    init() {
      self.listings = {}

      emit ListingManagerCreated(self.uuid)
    }

    destroy () {
      assert(self.listings.keys.length == 0, message: "There are uncompleted listings")

      emit ListingManagerDestroyed(self.uuid)
    }

    pub fun getOwnership(_ listingId: UInt64): Bool {
      let details = MelosMarketplace.getListingDetails(listingId)
      return details == nil ? false : details!.listingManagerId == self.uuid
    }

    pub fun createListing(
      listingType: ListingType,
      nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      nftType: Type,
      nftId: UInt64,
      paymentToken: Type,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>
    ): UInt64 {
        let listing <- create Listing(
          listingType: listingType,
          nftProvider: nftProvider,
          listingManagerId: self.uuid,
          nftType: nftType,
          nftId: nftId,
          paymentToken: paymentToken,
          listingConfig: listingConfig,
          receiver: receiver
        )
        let listingId = listing.uuid

        self.listings[listingId] = &listing as &Listing
        let _ <- MelosMarketplace.listings[listingId] <- listing
        destroy _

        return listingId
    }

    pub fun removeListing(listingId: UInt64) {
      assert(MelosMarketplace.isListingExists(listingId), message: "Listing not exists")
      assert(self.getOwnership(listingId), message: "Invalid listing ownership")

      let listing <- MelosMarketplace.listings.remove(key: listingId)!
      let nftId = listing.getDetails().nftId

      destroy listing
    }

    // TODO
    pub fun acceptOpenBid(listingId: UInt64, bidId: UInt64) {

    }
  }
  /* --------------- ↑↑ Listings ↑↑ --------------- */
}