import FungibleToken from "core/FungibleToken.cdc"
import NonFungibleToken from "core/NonFungibleToken.cdc"


pub contract MelosMarketplace {

  // Type of each listing
  pub enum ListingType: UInt8 {
    pub case Common
    pub case OpenBid
    pub case DutchAuction
    pub case EnglishAuction
  }

  // Platform fee configuration
  // 
  // Fee deducted when the order is completed, including tx fees and royalties
  pub struct FungibleTokenFeeConfig {
    pub var txFeeReceiver: Capability<&{FungibleToken.Receiver}>
    pub var txFeePercent: UFix64
    pub var royaltyReceiver: Capability<&{FungibleToken.Receiver}>

    init (
      txFeeReceiver: Capability<&{FungibleToken.Receiver}>,
      txFeePercent: UFix64,
      royaltyReceiver: Capability<&{FungibleToken.Receiver}>,
    ) {
      assert(txFeeReceiver.borrow() != nil, message: "Cannot borrow txFeeReceiver")
      assert(royaltyReceiver.borrow() != nil, message: "Cannot borrow royaltyReceiver")

      self.txFeeReceiver = txFeeReceiver
      self.txFeePercent = txFeePercent
      self.royaltyReceiver = royaltyReceiver
    }
  }

  // -----------------------------------------------------------------------
  // Contract-level vars
  // -----------------------------------------------------------------------

  // Admin resources
  pub let AdminStoragePath: StoragePath

  // Listing manager resource
  pub let ListingManagerStoragePath: StoragePath
  pub let ListingManagerPublicPath: PublicPath

  // Bid manager resource
  pub let BidManagerStoragePath: StoragePath
  pub let BidManagerPublicPath: PublicPath


  pub var minimumListingDuration: UFix64?
  pub var maxAuctionDuration: UFix64?

  access(self) let listings: @{UInt64: Listing}
  access(self) var allowedPaymentTokens: [Type]
  access(self) let feeConfigs: {String: FungibleTokenFeeConfig}

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  // Emitted when contract is initialized
  pub event MelosSettlementInitialized();

  // Emitted when ListingManager is initialized
  pub event ListingManagerCreated(_ listingManagerResourceID: UInt64)
  // Emitted when ListingManager is destroyed
  pub event ListingManagerDestroyed(_ listingManagerResourceID: UInt64)

  // Fee events
  pub event FungibleTokenFeeUpdated(
    token: String, 
    txFeeReceiver: Address, 
    txFeePercent: UFix64,
    royaltyReceiver: Address 
  )
  pub event TxFeeCutted(listingId: UInt64, txFee: UFix64?, royalty: UFix64?)
  pub event FungibleTokenFeeRemoved(token: String)

  // Contract config events
  pub event MinimumListingDurationChanged(old: UFix64?, new: UFix64?)
  pub event MaxAuctionDurationChanged(old: UFix64?, new: UFix64?)
  pub event AllowedPaymentTokensChanged(old: [Type]?, new: [Type]?)

  // Bid listing events
  //
  // Includes English auctions and open-bid
  pub event BidCreated(listingId: UInt64, bidId: UInt64, bidder: Address, offerPrice: UFix64)
  pub event BidRemoved(listingId: UInt64, bidId: UInt64)
  pub event BidListingCompleted(listingId: UInt64, topBid: UInt64?, winner: Address?, price: UFix64)

  // Listing events
  pub event ListingCreated(
    listingId: UInt64,
    listingType: UInt8,
    seller: Address, 
    nftId: UInt64,
    nftType: Type,
    nftResourceUUID: UInt64,
    paymentToken: Type,
    listingStartTime: UFix64,
    listingEndTime: UFix64?
  )
  pub event ListingRemoved(listingId: UInt64, purchased: Bool)
  pub event FixedPricesListingCompleted(listingId: UInt64, payment: UFix64, buyer: Address)

  // -----------------------------------------------------------------------
  // Contract Initilization
  // -----------------------------------------------------------------------

  init () {
    self.minimumListingDuration = nil
    self.maxAuctionDuration = nil

    self.listings <- {}
    self.allowedPaymentTokens = []
    self.feeConfigs = {}

    self.AdminStoragePath = /storage/MelosSettlementAdmin
    self.ListingManagerPublicPath = /public/MelosMarketplace
    self.ListingManagerStoragePath = /storage/MelosMarketplace
    self.BidManagerPublicPath = /public/MelosBidManager
    self.BidManagerStoragePath = /storage/MelosBidManager

    // Create admint resource and do some settings
    let admin <- create Admin()

    // Save admin resource to account
    self.account.save(<-admin, to: self.AdminStoragePath)

    emit MelosSettlementInitialized()
  }

  // -----------------------------------------------------------------------
  // Contract-level Functions
  // -----------------------------------------------------------------------

  // Get all current listing ids
  pub fun getListingIds(): [UInt64] {
    return self.listings.keys
  }

  // Get current listing counts
  pub fun getListingCount(): Int {
    return self.listings.length
  }

  // Checks whether the specified listing id exists
  pub fun isListingExists(_ listingId: UInt64): Bool {
    return self.listings[listingId] != nil
  }

  // Get the public interface of the specified listing
  pub fun getListing(_ listingId: UInt64): &{ListingPublic}? {
    return &self.listings[listingId] as? &Listing
  }

  // Get the details struct of the specified listing
  pub fun getListingDetails(_ listingId: UInt64): ListingDetails? {
    return self.getListing(listingId)?.getDetails()
  }

  // Get the public interface of the specified bid
  pub fun getBid(listingId: UInt64, bidId: UInt64): &{BidPublic}? {
    if let listing = self.getListing(listingId) {
      return listing.getBid(bidId)
    }
    return nil
  }

  // Get the fungibletoken fee configuration of the contract
  pub fun getFeeConfigs(): {String: FungibleTokenFeeConfig} {
    return self.feeConfigs
  }

  // Get the fungibletoken fee of the specified token
  pub fun getFeeConfigByTokenType(tokenType: Type): FungibleTokenFeeConfig? {
    return self.feeConfigs[tokenType.identifier]
  }

  // Get the fungibletokens currently supported by the contract
  pub fun getAllowedPaymentTokens(): [Type] {
    return self.allowedPaymentTokens
  }

  // Check if the token is allowed
  pub fun isTokenAllowed(_ token: Type): Bool {
    return self.allowedPaymentTokens.contains(token)
  }

  pub fun fastSort(_ arr: [AnyStruct], fn: ((AnyStruct, AnyStruct): Bool)): [AnyStruct] {
    if (arr.length < 2) {
      return arr
    }
    let left: [AnyStruct] = []
    let right: [AnyStruct] = []
    let p = arr.remove(at: arr.length / 2)
    for i in arr {
      if fn(i, p) {
        left.append(i)
      } else {
        right.append(i)
      }
    }
    return MelosMarketplace.fastSort(left, fn: fn).concat([p]).concat(MelosMarketplace.fastSort(right, fn: fn))
  }

  // Check if the type of the listing matches
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

  // Allow anyone to remove listings that matches the condition
  //
  // 1. listing is started
  // 2. [listing is purchased] or [NFT is not avaliable] or [listing is ended]
  //
  // If the listing type is english auction, it will be done automatically when the condition is matched
  pub fun removeListing(listingId: UInt64): Bool {
    let listingRef = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
    if listingRef.isListingStarted() 
        && (listingRef.isPurchased() 
        || !listingRef.isNFTAvaliable()
        || listingRef.isListingEnded()) {
      destroy MelosMarketplace.listings.remove(key: listingId)
      return true
    }

    return false
  }

  pub fun createListingManager(): @ListingManager {
    return <-create ListingManager()
  }

  pub fun createBidManager(): @BidManager {
    return <-create BidManager()
  }

  // -----------------------------------------------------------------------
  // Admin resource
  // -----------------------------------------------------------------------

  pub resource Admin {
    pub fun setTokenFeeConfig(
      tokenType: Type, 
      config: FungibleTokenFeeConfig
    ) {
      MelosMarketplace.feeConfigs[tokenType.identifier] = config
      emit FungibleTokenFeeUpdated(
        token: tokenType.identifier, 
        txFeeReceiver: config.txFeeReceiver.address, 
        txFeePercent: config.txFeePercent,
        royaltyReceiver: config.royaltyReceiver.address
      )
    }

    pub fun removeTokenFeeConfig(_ tokenType: Type) {
      let cfg = MelosMarketplace.feeConfigs.remove(key: tokenType.identifier)
      assert(cfg != nil, message: "Fee config not exists")
      emit FungibleTokenFeeRemoved(token: tokenType.identifier)
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

  // -----------------------------------------------------------------------
  // ListingConfig structs
  // -----------------------------------------------------------------------

  pub struct interface ListingConfig {
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64?
    pub let royaltyPercent: UFix64?
    pub fun getPrice(): UFix64
  }

  pub struct Common: ListingConfig {
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64?
    pub let royaltyPercent: UFix64?

    pub let price: UFix64

    init (
      listingStartTime: UFix64, 
      listingEndTime: UFix64?, 
      royaltyPercent: UFix64?, 
      price: UFix64
      ) {
      if listingEndTime != nil {
        assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
        assert((listingEndTime! - listingStartTime) > MelosMarketplace.minimumListingDuration ?? 0.0, message: "Listing duration must be greater than minimum listing duration")
      }
      self.listingStartTime = listingStartTime
      self.listingEndTime = listingEndTime
      self.royaltyPercent = royaltyPercent

      self.price = price
    }

    pub fun getPrice(): UFix64 {
      return self.price
    }
  }

  pub struct OpenBid: ListingConfig {
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64?
    pub let royaltyPercent: UFix64?

    pub let minimumPrice: UFix64

    init (
      listingStartTime: UFix64, 
      listingEndTime: UFix64?, 
      royaltyPercent: UFix64?, 
      minimumPrice: UFix64
    ) {
      if listingEndTime != nil {
        assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
        assert((listingEndTime! - listingStartTime) > MelosMarketplace.minimumListingDuration ?? 0.0, message: "Listing duration must be greater than minimum listing duration")
      }
      self.listingStartTime = listingStartTime
      self.listingEndTime = listingEndTime
      self.royaltyPercent = royaltyPercent

      self.minimumPrice = minimumPrice
    }

    pub fun getPrice(): UFix64 {
      return self.minimumPrice
    }
  }

  pub struct DutchAuction: ListingConfig {
    pub let listingStartTime: UFix64
    pub let listingEndTime: UFix64?
    pub let royaltyPercent: UFix64?

    pub let startingPrice: UFix64
    pub let reservePrice: UFix64
    pub let priceCutInterval: UFix64

    init (
      listingStartTime: UFix64, 
      listingEndTime: UFix64?, 
      royaltyPercent: UFix64?,
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
      self.royaltyPercent = royaltyPercent

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
    pub let royaltyPercent: UFix64?

    pub let reservePrice: UFix64
    pub let minimumBidPercentage: UFix64

    pub let basePrice: UFix64
    pub var currentPrice: UFix64
    pub var topBidId: UInt64?

    init (
      listingStartTime: UFix64, 
      listingEndTime: UFix64?, 
      royaltyPercent: UFix64?,
      reservePrice: UFix64,
      minimumBidPercentage: UFix64,
      basePrice: UFix64
    ) {
      assert(reservePrice >= basePrice, message: "Reserve price must be greater than or equal with base price")
      assert(listingEndTime != nil, message: "English auction listingEndTime must not null")
      assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
      assert((listingEndTime! - listingStartTime) > MelosMarketplace.minimumListingDuration ?? 0.0, message: "Listing duration must be greater than minimum listing duration")
      if let maxAuctionDuration = MelosMarketplace.maxAuctionDuration {
        assert((listingEndTime! - listingStartTime) <= maxAuctionDuration, message: "Auction duration must be less than max auction duration")
      }

      self.listingStartTime = listingStartTime
      self.listingEndTime = listingEndTime
      self.royaltyPercent = royaltyPercent

      self.reservePrice = reservePrice
      self.minimumBidPercentage = minimumBidPercentage

      self.basePrice = basePrice
      self.currentPrice = basePrice
      self.topBidId = nil
    }

    pub fun getPrice(): UFix64 {
      return self.currentPrice
    }

    pub fun getNextBidMinimumPrice(): UFix64 {
      return self.getPrice() * (1.0 + self.minimumBidPercentage)
    }

    access(contract) fun setTopBid(newTopBid: &{BidPublic}?) {
      self.topBidId = newTopBid?.uuid ?? nil
      self.currentPrice = newTopBid?.offerPrice() ?? self.basePrice
    }
  }

  // -----------------------------------------------------------------------
  // Bid resources
  // -----------------------------------------------------------------------

  pub resource interface BidPublic {
    pub let listingId: UInt64
    pub let bidder: Address
    pub let bidManagerId: UInt64
    pub fun offerPrice(): UFix64
    pub fun bidTime(): UFix64
  }

  pub resource Bid: BidPublic {
    access(contract) let bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>
    access(contract) let rewardCollection: Capability<&{NonFungibleToken.Receiver}>
    access(contract) let refund: Capability<&{FungibleToken.Receiver}>
    access(contract) let payment: @FungibleToken.Vault

    pub let listingId: UInt64
    pub let bidder: Address
    pub let bidManagerId: UInt64
    access(contract) var bidTimestamp: UFix64

    init(
      bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
      listingId: UInt64,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ) {
      assert(bidManager.check(), message: "Invalid bidManager")
      assert(rewardCollection.check(), message: "Invalid NFT reward collection")
      assert(refund.check(), message: "Invalid refund capability")

      self.bidManager = bidManager
      let bidManagerRef = self.bidManager.borrow()!
      bidManagerRef.recordBid(listingId: listingId, bidId: self.uuid)

      self.listingId = listingId

      self.rewardCollection = rewardCollection
      self.refund = refund
      self.payment <- payment

      self.bidder = self.refund.address
      self.bidManagerId = bidManagerRef.uuid
      self.bidTimestamp = getCurrentBlock().timestamp
    }

    pub fun offerPrice(): UFix64 {
      return self.payment.balance
    }

    pub fun bidTime(): UFix64 {
      return self.bidTimestamp
    }

    destroy() {
      self.bidManager.borrow()!.removeBid(listingId: self.listingId, bidId: self.uuid)
      self.refund.borrow()!.deposit(from: <- self.payment)
    }
  }

  // -----------------------------------------------------------------------
  // BidManager resources
  // -----------------------------------------------------------------------

  pub resource interface BidManagerPublic {
    pub fun getListings(): {UInt64: [UInt64]}
    pub fun getBidOwnership(listingId: UInt64, bidId: UInt64): Bool
    pub fun isBidExists(listingId: UInt64, bidId: UInt64): Bool 
    pub fun getRecords(): {UInt64: [UInt64]}
    pub fun findBidIndex(listingId: UInt64, bidId: UInt64): Int? 
    pub fun getBidIdsWithListingId(_ listingId: UInt64): [UInt64]

    access(contract) fun recordBid(listingId: UInt64, bidId: UInt64): Bool
    access(contract) fun removeBid(listingId: UInt64, bidId: UInt64): Bool
  }

  pub resource BidManager: BidManagerPublic {
    // ListingId => [BidId]
    access(self) let listings: {UInt64: [UInt64]}

    init () {
      self.listings = {}
    }

    pub fun getListings(): {UInt64: [UInt64]} {
      return self.listings
    }

    pub fun getBidOwnership(listingId: UInt64, bidId: UInt64): Bool {
      let bidRef = MelosMarketplace.getBid(listingId: listingId, bidId: bidId)
      return bidRef == nil ? false : bidRef!.bidManagerId == self.uuid
    }

    pub fun isBidExists(listingId: UInt64, bidId: UInt64): Bool {
      if let bids = self.listings[listingId] {
        if bids.contains(bidId) {
          return true
        }
      }
      return false
    }

    pub fun findBidIndex(listingId: UInt64, bidId: UInt64): Int? {
      if let bids = self.listings[listingId] {
        for index, id in bids {
          if id == bidId {
            return index
          }
        }
      }
      return nil
    }

    pub fun getRecords(): {UInt64: [UInt64]} {
      return self.listings
    }

    pub fun getBidIdsWithListingId(_ listingId: UInt64): [UInt64] {
      return self.listings[listingId] ?? []
    }

    access(contract) fun recordBid(listingId: UInt64, bidId: UInt64): Bool {
      if self.listings[listingId] == nil {
        self.listings[listingId] = [bidId]
        return true
      } else if !self.listings[listingId]!.contains(bidId) {
        self.listings[listingId]!.append(bidId)
        return true
      }
      return false
    }

    access(contract) fun removeBid(listingId: UInt64, bidId: UInt64): Bool {
      if self.listings[listingId] != nil {
        if let index = self.findBidIndex(listingId: listingId, bidId: bidId) {
          self.listings[listingId]!.remove(at: index)
          return true
        }
      }
      return false
    }

    destroy() {
      for bids in self.listings.values {
        assert(bids.length == 0, message: "Bid records exists")
      }
    }
  }

  // -----------------------------------------------------------------------
  // Listings
  // -----------------------------------------------------------------------

  pub struct ListingDetails {
    pub let listingType: UInt8
    pub let listingManagerId: UInt64

    pub let nftType: Type
    pub let nftId: UInt64
    pub let nftResourceUUID: UInt64
    pub let paymentToken: Type
    pub let listingConfig: {MelosMarketplace.ListingConfig}
    pub let receiver: Capability<&{FungibleToken.Receiver}>

    pub var isPurchased: Bool

    init (
      listingType: ListingType,
      listingManagerId: UInt64,
      nftType: Type,
      nftId: UInt64,
      nftResourceUUID: UInt64,
      paymentToken: Type,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>
    ) {
      self.listingType = listingType.rawValue
      self.listingManagerId = listingManagerId
      self.isPurchased = false
      self.nftType = nftType
      self.nftId = nftId
      self.nftResourceUUID = nftResourceUUID
      self.paymentToken = paymentToken
      self.listingConfig = listingConfig
      self.receiver = receiver
    }

    pub fun getPrice(): UFix64 {
      return self.listingConfig.getPrice()
    }

    access(contract) fun setToPurchased() {
        assert(!self.isPurchased, message: "Listing is already purchased")
        self.isPurchased = true
    }
  }

  pub resource interface ListingPublic {
    pub fun isListingType(_ typ: ListingType): Bool
    pub fun config(): {MelosMarketplace.ListingConfig}
    pub fun getEnglishAuctionParticipants(): {Address: UInt64}
    pub fun getBids(): [&{BidPublic}]
    pub fun getSortedBids(): [&{BidPublic}]
    pub fun getTopBidFromBids(): &{BidPublic}?
    pub fun getBid(_ bidId: UInt64): &{BidPublic}?
    pub fun getDetails(): ListingDetails
    pub fun getPrice(): UFix64
    pub fun isNFTAvaliable(): Bool
    pub fun isListingEnded(): Bool
    pub fun isListingStarted(): Bool
    pub fun isPurchased(): Bool
    pub fun ensurePaymentTokenType(_ payment: @FungibleToken.Vault): @FungibleToken.Vault

    pub fun purchase(payment: @FungibleToken.Vault, rewardCollection: Capability<&{NonFungibleToken.Receiver}>): Bool
    pub fun createOpenBid(
      bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64
    pub fun createEnglishAuctionBid(
      bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64
    pub fun createBid(
        bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
        rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
        refund: Capability<&{FungibleToken.Receiver}>,
        payment: @FungibleToken.Vault
    ): UInt64
    pub fun removeBid(bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>, removeBidId: UInt64): Bool
  }

  pub resource Listing: ListingPublic {
    access(self) let details: ListingDetails
    access(self) var nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>
    access(self) let refund: Capability<&{NonFungibleToken.CollectionPublic}>

    // Bid id => Bid
    access(self) let bids: @{UInt64: Bid}

    // Address => bid id
    access(self) var englishAuctionParticipant: {Address: UInt64}

    init(
      listingType: ListingType,
      nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      nftId: UInt64,
      paymentToken: Type,
      refund: Capability<&{NonFungibleToken.CollectionPublic}>,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>,
      listingManagerId: UInt64
    ) {
      MelosMarketplace.checkListingConfig(listingType, listingConfig)
      assert(MelosMarketplace.isTokenAllowed(paymentToken), message: "Payment tokens not allowed")
      assert(receiver.borrow() != nil, message: "Cannot borrow receiver")
      assert(refund.borrow() != nil, message: "Cannot borrow refund")
      
      let txFeePercent = MelosMarketplace.getFeeConfigByTokenType(tokenType: paymentToken)?.txFeePercent ?? 0.0
      let royaltyPercent = listingConfig.royaltyPercent ?? 0.0
      assert((txFeePercent + royaltyPercent) < 1.0, message: "txFeePercent + royaltyPercent should be smaller than 100%")

      let collection = nftProvider.borrow() ?? panic("Cannot borrow NFT collection")
      let nftRef = collection.borrowNFT(id: nftId)
      assert(nftRef.id == nftId, message: "Invalid NFT id")

      let nftType = nftRef.getType()

      self.details = ListingDetails(
        listingType: listingType,
        listingManagerId: listingManagerId,
        nftType: nftType,
        nftId: nftId,
        nftResourceUUID: nftRef.uuid,
        paymentToken: paymentToken,
        listingConfig: listingConfig,
        receiver: receiver
      )
      self.nftProvider = nftProvider
      self.refund = refund
      self.bids <- {}
      self.englishAuctionParticipant = {}
      
      emit ListingCreated(
          listingId: self.uuid,
          listingType: listingType.rawValue,
          seller: nftProvider.address, 
          nftId: nftId,
          nftType: nftType,
          nftResourceUUID: nftRef.uuid,
          paymentToken: paymentToken,
          listingStartTime: listingConfig.listingStartTime,
          listingEndTime: listingConfig.listingEndTime
      )
    }

    destroy () {
      if self.isListingType(ListingType.EnglishAuction) 
          && self.isListingStarted()
          && self.isListingEnded()
          && !self.isPurchased() {
        self.completeEnglishAuction()
      }

      destroy self.bids

      emit ListingRemoved(
        listingId: self.uuid,
        purchased: self.details.isPurchased,
      )
    }

    pub fun isListingType(_ typ: ListingType): Bool {
      return self.details.listingType == typ.rawValue
    }

    pub fun config(): {MelosMarketplace.ListingConfig} {
      return self.details.listingConfig
    }

    pub fun getEnglishAuctionParticipants(): {Address: UInt64} {
      return self.englishAuctionParticipant
    }

    pub fun getBids(): [&{BidPublic}] {
      let temp: [&Bid] = []
      for bidId in self.bids.keys {
        temp.append(&self.bids[bidId] as &Bid)
      }
      return temp
    }

    pub fun getSortedBids(): [&{BidPublic}] {
      let temp: [&Bid] = []
      let sortFn = fun (pre: AnyStruct, cur: AnyStruct): Bool {
        return (pre as! &Bid).offerPrice() > (cur as! &Bid).offerPrice()
      }
      let sorted = MelosMarketplace.fastSort(self.getBids(), fn: sortFn)
      for i in sorted {
        temp.append(i as! &Bid)
      }
      return temp
    }

    pub fun getTopBidFromBids(): &{BidPublic}? {
      let temp = self.getSortedBids()
      if temp.length == 0 {
        return nil
      }
      return temp[0]
    }

    pub fun getBid(_ bidId: UInt64): &{BidPublic}? {
      return &self.bids[bidId] as? &Bid
    }

    pub fun getDetails(): ListingDetails {
      return self.details
    }

    pub fun getPrice(): UFix64 {
      return self.details.getPrice()
    }

    pub fun isListingEnded(): Bool {
      if let endTime = self.config().listingEndTime {
        return getCurrentBlock().timestamp < endTime
      }
      return false
    }

    pub fun isNFTAvaliable(): Bool {
      if let _ = self.nftProvider.borrow() {
        return true
      }
      return false
    }

    pub fun isListingStarted(): Bool {
      return getCurrentBlock().timestamp >= self.config().listingStartTime
    }

    pub fun isPurchased(): Bool {
      return self.details.isPurchased
    }

    pub fun ensurePaymentTokenType(_ payment: @FungibleToken.Vault): @FungibleToken.Vault {
      assert(payment.isInstance(self.details.paymentToken), message: "payment vault is not requested fungible token")
      return <- payment
    }

    access(contract) fun clearBids() {
      for key in self.bids.keys {
        destroy self.bids.remove(key: key)
      }
      if self.isListingType(ListingType.EnglishAuction)  {
        self.englishAuctionParticipant = {}
      }
    }

    access(self) fun withdrawNFT(): @NonFungibleToken.NFT {
      self.details.setToPurchased()
      return <- self.nftProvider.borrow()!.withdraw(withdrawID: self.details.nftId)
    }

    access(self) fun deductFees(_ payment: @FungibleToken.Vault): @FungibleToken.Vault {
      var txFee: UFix64? = nil
      var royalty: UFix64? = nil
      // Deducting platform fees
      if let feeConfig = MelosMarketplace.getFeeConfigByTokenType(tokenType: payment.getType()) {
        if let txFeeReceiver = feeConfig.txFeeReceiver.borrow() {
          txFee = payment.balance * feeConfig.txFeePercent
          txFeeReceiver.deposit(
            from: <- payment.withdraw(
              amount: txFee!
            )
          )
        }
        if let royaltyReceiver = feeConfig.royaltyReceiver.borrow() {
          if let royaltyPercent = self.details.listingConfig.royaltyPercent {
            royalty = payment.balance * royaltyPercent
            royaltyReceiver.deposit(
              from: <- payment.withdraw(
                amount: royalty!
              )
            )
          }
        }
      }
      if txFee != nil || royalty != nil {
        emit TxFeeCutted(listingId: self.uuid, txFee: txFee, royalty: royalty)
      }
      return <- payment
    }

    access(self) fun completeListing(_ payment: @FungibleToken.Vault?): @NonFungibleToken.NFT {
      if payment == nil {
        destroy payment
        return <- self.withdrawNFT()
      }

      let payment <- self.deductFees(<- payment!)

      // Deposit the remaining amount after deducting fees and royalties to the beneficiary.
      self.details.receiver.borrow()!.deposit(from: <- payment)

      return <- self.withdrawNFT()
    }

    pub fun purchase(payment: @FungibleToken.Vault, rewardCollection: Capability<&{NonFungibleToken.Receiver}>): Bool {
      // Check listing and params
      assert([ListingType.Common, ListingType.DutchAuction].contains(
        ListingType(rawValue: self.details.listingType)!), message: "Listing type is not supported")
      assert(!self.isPurchased(), message: "Listing has already been purchased")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(!self.isListingEnded(), message: "Listing has ended")

      let reward = rewardCollection.borrow() ?? panic("Cannot borrow reward NFT collection")

      let payment <- self.ensurePaymentTokenType(<- payment)
      let paymentBalance = payment.balance
  
      let price = self.getPrice()
      assert(paymentBalance >= price, message: "insufficient payments")

      let nft <- self.completeListing(<- payment)
      reward.deposit(token: <- nft)
      
      emit FixedPricesListingCompleted(listingId: self.uuid, payment: paymentBalance, buyer: rewardCollection.address)

      return true
    }

    pub fun createOpenBid(
      bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      // Check listing and params
      assert(self.isListingType(ListingType.OpenBid), message: "Listing type is not OpenBid")
      assert(!self.isPurchased(), message: "Listing has already been purchased")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(!self.isListingEnded(), message: "Listing has ended")
  
      let payment <- self.ensurePaymentTokenType(<- payment)
      let offerPrice = payment.balance
      assert(offerPrice >= (self.config() as! OpenBid).minimumPrice, message: "Offer price must be greater than minimumPrice")

      let bid <- create Bid(
        bidManager: bidManager,
        listingId: self.uuid,
        rewardCollection: rewardCollection,
        refund: refund,
        payment: <- payment
      )
      let bidId = bid.uuid

      let _ <- self.bids[bidId] <- bid
      destroy _;

      emit BidCreated(listingId: self.uuid, bidId: bidId, bidder: refund.address, offerPrice: offerPrice)

      return bidId
    }

    pub fun createEnglishAuctionBid(
      bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      // Check listing and params
      assert(self.isListingType(ListingType.EnglishAuction), message: "Listing type is not EnglishAuction")
      assert(!self.isPurchased(), message: "Listing has already been purchased")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(!self.isListingEnded(), message: "Listing has ended")
      
      let payment <- self.ensurePaymentTokenType(<- payment)
      let offerPrice = payment.balance
      let cfg = self.config() as! EnglishAuction
      assert(offerPrice >= cfg.getNextBidMinimumPrice(), 
        message: "Offer price must be greater than or equal with [CurrentPrice * (1 + Minimum bid percentage)]"
      )

      // If account has bid before
      if let oldBidId = self.englishAuctionParticipant[refund.address] {
        let oldBid <- self.bids.remove(key: oldBidId)!
        payment.deposit(from: <- oldBid.payment.withdraw(amount: oldBid.payment.balance))
        destroy oldBid
      }

      let bid <- create Bid(
        bidManager: bidManager,
        listingId: self.uuid,
        rewardCollection: rewardCollection,
        refund: refund,
        payment: <- payment
      )
      let bidRef = &bid as &Bid
      let bidId = bid.uuid

      let _ <- self.bids[bidId] <- bid
      destroy _;

      cfg.setTopBid(newTopBid: bidRef)

      emit BidCreated(
        listingId: self.uuid, 
        bidId: bidId,
        bidder: refund.address, 
        offerPrice: offerPrice
      )

      return bidId
    }

    pub fun createBid(
      bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      switch ListingType(rawValue: self.details.listingType)! {
        case ListingType.OpenBid:
          return self.createOpenBid(
            bidManager: bidManager, 
            rewardCollection: rewardCollection, 
            refund: refund, 
            payment: <- payment
          )
        case ListingType.EnglishAuction:
          return self.createEnglishAuctionBid(
            bidManager: bidManager, 
            rewardCollection: rewardCollection, 
            refund: refund, 
            payment: <- payment
          )
      }
      panic("Listing type not support")
    }

    pub fun removeBid(bidManager: Capability<&{MelosMarketplace.BidManagerPublic}>, removeBidId: UInt64): Bool {
      let removeBidRef = self.getBid(removeBidId)
      assert(removeBidRef != nil, message: "Bid not exists")
      assert(bidManager.borrow()!.uuid == removeBidRef!.bidManagerId, message: "Invalid bid ownership")

      let removeBid <- self.bids.remove(key: removeBidId)!
      if self.isListingType(ListingType.EnglishAuction) {
        let cfg = self.config() as! EnglishAuction
        if removeBidId == cfg.topBidId {
          cfg.setTopBid(newTopBid: self.getTopBidFromBids())
        }
        
        self.englishAuctionParticipant.remove(key: removeBid.bidder)
      }

      emit BidRemoved(listingId: self.uuid, bidId: removeBidId)
      destroy removeBid

      return true
    }

    pub fun acceptOpenBid(listingManagerCapability: Capability<&MelosMarketplace.ListingManager>, bidId: UInt64): Bool {
      let listingManager = listingManagerCapability.borrow()
      assert(listingManager != nil, message: "Cannot borrow listingManager")
      assert(listingManager!.uuid == self.details.listingManagerId, message: "Invalid listing ownership")

      return self.processAcceptOpenBid(listingManager: listingManager!, bidId: bidId)
    }

    access(contract) fun processAcceptOpenBid(listingManager: &MelosMarketplace.ListingManager, bidId: UInt64): Bool {
      // Check listing and params
      assert(self.isListingType(ListingType.OpenBid), message: "Listing type is not EnglishAuction")
      assert(!self.isPurchased(), message: "Listing has already been purchased")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(!self.isListingEnded(), message: "Listing has ended")
      assert(self.getBid(bidId) != nil, message: "Bid not exists")

      let targetBid <- self.bids.remove(key: bidId)!
      let price = targetBid.payment.balance
      let winner = targetBid.refund.address
      let bidId = targetBid.uuid

      let nft <- self.completeListing(<- targetBid.payment.withdraw(amount: price))
      targetBid.rewardCollection.borrow()!.deposit(token: <- nft)
      destroy targetBid

      self.clearBids()

      emit BidListingCompleted(listingId: self.uuid, topBid: bidId, winner: winner, price: price)
      return true
    }

    pub fun completeEnglishAuction(): Bool {
      // Check listing and params
      assert(self.isListingType(ListingType.EnglishAuction), message: "Listing type is not EnglishAuction")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(self.isListingEnded(), message: "English auction is not ended")
      assert(!self.isPurchased(), message: "Listing has already been purchased")

      let cfg = self.config() as! EnglishAuction
  
      // The result should be 'Not traded'
      if cfg.topBidId == nil || cfg.currentPrice <= cfg.reservePrice {
        let nft <- self.completeListing(nil)
        self.refund.borrow()!.deposit(token: <- nft)

        emit BidListingCompleted(listingId: self.uuid, topBid: nil, winner: nil, price: cfg.currentPrice)
        return false
      }
      
      let topBid <- self.bids.remove(key: cfg.topBidId!)!

      let price = topBid.payment.balance
      let winner = topBid.refund.address
      let bidId = topBid.uuid

      let nft <- self.completeListing(<- topBid.payment.withdraw(amount: price))
      topBid.rewardCollection.borrow()!.deposit(token: <- nft)

      destroy topBid
      self.clearBids()

      emit BidListingCompleted(listingId: self.uuid, topBid: bidId, winner: winner, price: price)
      return true
    }
  }

  // -----------------------------------------------------------------------
  // ListingManager resource
  // -----------------------------------------------------------------------


  pub resource interface ListingManagerPublic {
    pub fun getlistings(): {UInt64: UInt64}
  }

  pub resource ListingManager: ListingManagerPublic {
    // Listing => NFT id
    access(self) let listings: {UInt64: UInt64}

    init() {
      self.listings = {}
      emit ListingManagerCreated(self.uuid)
    }

    destroy () {
      assert(self.listings.keys.length == 0, message: "There are uncompleted listings")

      emit ListingManagerDestroyed(self.uuid)
    }

    pub fun getlistings(): {UInt64: UInt64} {
      return self.listings
    }

    pub fun getListingOwnership(_ listingId: UInt64): Bool {
      if let details = MelosMarketplace.getListingDetails(listingId) {
        return details.listingManagerId == self.uuid
      }
      return false
    }

    pub fun createListing(
      listingType: ListingType,
      nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      nftId: UInt64,
      paymentToken: Type,
      refund: Capability<&{NonFungibleToken.CollectionPublic}>,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>
    ): UInt64 {
      let listing <- create Listing(
        listingType: listingType,
        nftProvider: nftProvider,
        nftId: nftId,
        paymentToken: paymentToken,
        refund: refund,
        listingConfig: listingConfig,
        receiver: receiver,
        listingManagerId: self.uuid
      )
      let listingId = listing.uuid

      self.listings[listingId] = nftId
      let _ <- MelosMarketplace.listings[listingId] <- listing
      destroy _

      return listingId
    }

    pub fun removeListing(listingId: UInt64) {
      let listingRef = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
      let listingDetails = listingRef.getDetails()
      assert(listingDetails.listingManagerId == self.uuid, message: "Invalid listing ownership")
    
      let listing <- MelosMarketplace.listings.remove(key: listingId)!
      destroy listing
    }

    pub fun acceptOpenBid(listingId: UInt64, bidId: UInt64): Bool {
      assert(MelosMarketplace.isListingExists(listingId), message: "Listing not exists")
      assert(self.getListingOwnership(listingId), message: "Invalid listing ownership")

      let listingRef = &MelosMarketplace.listings[listingId] as &Listing
      return listingRef.processAcceptOpenBid(listingManager: &self as &ListingManager, bidId: bidId)
    }
  }
}