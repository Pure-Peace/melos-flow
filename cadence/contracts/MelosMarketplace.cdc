import FungibleToken from "core/FungibleToken.cdc"
import NonFungibleToken from "core/NonFungibleToken.cdc"


pub contract MelosMarketplace {

  pub enum ListingType: UInt8 {
    pub case Common
    pub case OpenBid
    pub case DutchAuction
    pub case EnglishAuction
  }

  pub struct FeeConfig {
    pub var receiver: Capability<&{FungibleToken.Receiver}>
    pub var makerRelayerFeePercent: UFix64
    pub var takerRelayerFeePercent: UFix64

    init (
      receiver: Capability<&{FungibleToken.Receiver}>,
      makerRelayerFeePercent: UFix64,
      takerRelayerFeePercent: UFix64
    ) {
      assert(receiver.borrow() != nil, message: "Cannot borrow receiver")
      self.receiver = receiver
      self.makerRelayerFeePercent = makerRelayerFeePercent
      self.takerRelayerFeePercent = takerRelayerFeePercent
    }
  }

  /* --------------- ↓↓ Vars ↓↓ --------------- */

  pub let AdminStoragePath: StoragePath
  pub let ListingManagerStoragePath: StoragePath
  pub let ListingManagerPublicPath: PublicPath
  pub let BidManagerStoragePath: StoragePath
  pub let BidManagerPublicPath: PublicPath


  pub var minimumListingDuration: UFix64?
  pub var maxAuctionDuration: UFix64?

  access(self) let listings: @{UInt64: Listing}
  access(self) var allowedPaymentTokens: [Type]
  access(self) let feeConfigs: {String: FeeConfig}

  /* --------------- ↓↓ Events ↓↓ --------------- */

  pub event MelosSettlementInitialized();

  pub event ListingManagerCreated(_ listingManagerResourceID: UInt64)
  pub event ListingManagerDestroyed(_ listingManagerResourceID: UInt64)

  pub event TokenFeeUpdated(
    token: String, 
    receiver: Address, 
    makerRelayerFeePercent: UFix64, 
    takerRelayerFeePercent: UFix64
  )
  pub event TokenFeeRemoved(token: String)

  pub event MinimumListingDurationChanged(old: UFix64?, new: UFix64?)
  pub event MaxAuctionDurationChanged(old: UFix64?, new: UFix64?)
  pub event AllowedPaymentTokensChanged(old: [Type]?, new: [Type]?)

  pub event OpenBidCreated(listingId: UInt64, bidId: UInt64, bidder: Address, offerPrice: UFix64)
  pub event OpenBidRemoved(listingId: UInt64, bidId: UInt64)
  pub event OpenBidCompleted(listingId: UInt64, bidId: UInt64, winner: Address, price: UFix64)

  pub event EnglishAuctionBidCreated(listingId: UInt64, bidId: UInt64, bidder: Address, offerPrice: UFix64)
  pub event EnglishAuctionBidRemoved(listingId: UInt64, bidId: UInt64)
  pub event EnglishAuctionCompleted(listingId: UInt64, bidId: UInt64, winner: Address, price: UFix64)

  pub event ListingCreated(
    listingType: UInt8,
    seller: Address, 
    listingId: UInt64,
    nftId: UInt64,
    nftType: Type,
    nftResourceUUID: UInt64,
    paymentToken: Type,
    listingStartTime: UFix64,
    listingEndTime: UFix64?
  )
  pub event ListingRemoved(purchased: Bool, listingId: UInt64)

  /* --------------- ↓↓ Initilization ↓↓ --------------- */

  init (
    feeRecipient: Address?,
    makerRelayerFeePercent: UFix64?,
    takerRelayerFeePercent: UFix64?,
    minimumListingDuration: UFix64?,
    maxAuctionDuration: UFix64?,
    allowedPaymentTokens: [Type],
    feeConfigs: {String: FeeConfig}?
  ) {
    self.minimumListingDuration = nil
    self.maxAuctionDuration = nil

    self.listings <- {}
    self.allowedPaymentTokens = []
    self.feeConfigs = feeConfigs ?? {}

    self.AdminStoragePath = /storage/MelosSettlementAdmin
    self.ListingManagerPublicPath = /public/MelosMarketplace
    self.ListingManagerStoragePath = /storage/MelosMarketplace
    self.BidManagerPublicPath = /public/MelosBidManager
    self.BidManagerStoragePath = /storage/MelosBidManager

    // Create admint resource and do some settings
    let admin <- create Admin()

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

  pub fun getListing(_ listingId: UInt64): &{ListingPublic}? {
    return &self.listings[listingId] as? &Listing
  }

  pub fun getBid(listingId: UInt64, bidId: UInt64): &{BidPublic}? {
    if let listing = self.getListing(listingId) {
      return listing.getBid(bidId)
    }
    return nil
  }

  pub fun getFeeConfigs(): {String: FeeConfig} {
    return self.feeConfigs
  }

  pub fun getFeeConfigByTokenType(tokenType: Type): FeeConfig? {
    return self.feeConfigs[tokenType.identifier]
  }

  pub fun getListingDetails(_ listingId: UInt64): ListingDetails? {
    return self.getListing(listingId)?.getDetails()
  }

  pub fun getAllowedPaymentTokens(): [Type] {
    return self.allowedPaymentTokens
  }

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
    pub fun setTokenFeeConfig(
      tokenType: Type, 
      config: FeeConfig
    ) {
      MelosMarketplace.feeConfigs[tokenType.identifier] = config
      emit TokenFeeUpdated(
        token: tokenType.identifier, 
        receiver: config.receiver.address, 
        makerRelayerFeePercent: config.makerRelayerFeePercent, 
        takerRelayerFeePercent: config.takerRelayerFeePercent
      )
    }

    pub fun removeTokenFeeConfig(_ tokenType: Type) {
      let cfg = MelosMarketplace.feeConfigs.remove(key: tokenType.identifier)
      assert(cfg != nil, message: "Fee config not exists")
      emit TokenFeeRemoved(token: tokenType.identifier)
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

    pub let basePrice: UFix64
    pub var currentPrice: UFix64
    pub var topBidId: UInt64?

    init (
      listingStartTime: UFix64, 
      listingEndTime: UFix64?, 
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
      if newTopBid != nil {
        assert(newTopBid!.offerPrice() >= self.getNextBidMinimumPrice(), message: "Offer price must be greater than or equal with [CurrentPrice * (1 + Minimum bid percentage)]")
      }
      self.topBidId = newTopBid?.uuid ?? nil
      self.currentPrice = newTopBid?.offerPrice() ?? self.basePrice
    }
  }

  /* --------------- ↑↑ ListingConfigs ↑↑ --------------- */

  /* --------------- ↓↓ Bids ↓↓ --------------- */

  pub resource interface BidPublic {
    pub let listingId: UInt64
    pub let bidder: Address
    pub let bidManagerId: UInt64
    pub fun offerPrice(): UFix64
    pub fun bidTime(): UFix64
  }

  pub resource Bid: BidPublic {
    access(contract) let bidManager: Capability<&MelosMarketplace.BidManager>
    access(contract) let rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>
    access(contract) let refund: Capability<&{FungibleToken.Receiver}>
    access(contract) let payment: @FungibleToken.Vault

    pub let listingId: UInt64
    pub let bidder: Address
    pub let bidManagerId: UInt64
    access(contract) var bidTimestamp: UFix64

    init(
      bidManager: Capability<&MelosMarketplace.BidManager>,
      listingId: UInt64,
      rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>,
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


  pub resource interface BidManagerPublic {
    pub fun getListings(): {UInt64: [UInt64]}
    pub fun getBidOwnership(listingId: UInt64, bidId: UInt64): Bool
    pub fun isBidExists(listingId: UInt64, bidId: UInt64): Bool 
    pub fun getRecords(): {UInt64: [UInt64]}
    pub fun findBidIndex(listingId: UInt64, bidId: UInt64): Int? 
    pub fun getBidIdsWithListingId(_ listingId: UInt64): [UInt64]
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

  /* --------------- ↑↑ Bids ↑↑ --------------- */

  /* --------------- ↓↓ Listings ↓↓ --------------- */

  pub struct ListingDetails {
    pub let listingType: ListingType
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
      self.listingType = listingType
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
        self.isPurchased = true
    }
  }

  pub resource interface ListingPublic {
    pub fun listingType(): ListingType
    pub fun config(): {MelosMarketplace.ListingConfig}
    pub fun getEnglishAuctionParticipants(): {Address: UInt64}
    pub fun getBids(): [&{BidPublic}]
    pub fun getSortedBids(): [&{BidPublic}]
    pub fun getTopBidFromBids(): &{BidPublic}?
    pub fun getBid(_ bidId: UInt64): &{BidPublic}?
    pub fun getDetails(): ListingDetails
    pub fun getPrice(): UFix64
    pub fun isListingEnded(): Bool
    pub fun isListingStarted(): Bool
    pub fun isPurchased(): Bool
    pub fun ensureAvaliable()
    pub fun ensurePaymentTokenType(_ payment: @FungibleToken.Vault): @FungibleToken.Vault
    pub fun purchaseCommon(payment: @FungibleToken.Vault): @NonFungibleToken.NFT
    pub fun purchaseDutchAuction(payment: @FungibleToken.Vault): @NonFungibleToken.NFT
    pub fun createOpenBid(
        bidManager: Capability<&MelosMarketplace.BidManager>,
        rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>,
        refund: Capability<&{FungibleToken.Receiver}>,
        payment: @FungibleToken.Vault
    ): UInt64
    pub fun createEnglishAuctionBid(
        bidManager: Capability<&MelosMarketplace.BidManager>,
        rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>,
        refund: Capability<&{FungibleToken.Receiver}>,
        payment: @FungibleToken.Vault
    ): UInt64
    pub fun removeBid(bidManager: Capability<&MelosMarketplace.BidManager>, removeBidId: UInt64): Bool
    pub fun completeEnglishAuction(): Bool
  }

  pub resource Listing: ListingPublic {
    access(self) let initialized: Bool
    access(self) let details: ListingDetails
    access(self) var nft: @NonFungibleToken.NFT?
    access(self) let refund: Capability<&{NonFungibleToken.CollectionPublic}>

    // Bid id => Bid
    access(self) let bids: @{UInt64: Bid}

    // Address => bid id
    access(self) var englishAuctionParticipant: {Address: UInt64}

    init(
      listingType: ListingType,
      nftCollection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
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

      let nft <- nftCollection.borrow()!.withdraw(withdrawID: nftId)
      assert(nft != nil, message: "Cannot get token from collection")
      assert(nft.id == nftId, message: "Invalid NFT id")

      let nftType = nft.getType()
      let nftResourceUUID = nft.uuid

      self.details = ListingDetails(
        listingType: listingType,
        listingManagerId: listingManagerId,
        nftType: nftType,
        nftId: nftId,
        nftResourceUUID: nftResourceUUID,
        paymentToken: paymentToken,
        listingConfig: listingConfig,
        receiver: receiver
      )
      self.nft <- nft
      self.refund = refund
      self.bids <- {}
      self.englishAuctionParticipant = {}
      self.initialized = true
      
      emit ListingCreated(
          listingType: listingType.rawValue,
          seller: self.owner?.address!, 
          listingId: self.uuid,
          nftId: nftId,
          nftType: nftType,
          nftResourceUUID: nftResourceUUID,
          paymentToken: paymentToken,
          listingStartTime: listingConfig.listingStartTime,
          listingEndTime: listingConfig.listingEndTime
      )
    }

    destroy () {
      if self.initialized {
        emit ListingRemoved(
          purchased: self.details.isPurchased, 
          listingId: self.uuid
        )
      }
      if let nft <- self.nft {
        self.refund.borrow()!.deposit(token: <- nft)
      } else {
        destroy self.nft
      }
      self.clearBids()
      destroy self.bids
    }

    pub fun listingType(): ListingType {
      return self.details.listingType
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
      return self.getSortedBids()[0]
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
      return self.config().listingEndTime != nil 
        ? getCurrentBlock().timestamp < self.config().listingEndTime! 
        : false
    }

    pub fun isListingStarted(): Bool {
      return getCurrentBlock().timestamp >= self.config().listingStartTime
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

    access(contract) fun clearBids() {
      for key in self.bids.keys {
        let bid <- self.bids.remove(key: key)
        destroy bid
      }
      if self.listingType() == ListingType.EnglishAuction {
        self.englishAuctionParticipant = {}
      }
    }

    access(self) fun withdrawNFT(): @NonFungibleToken.NFT {
      assert(self.nft != nil, message: "Already withdrawn")
      self.details.setToPurchased()
      let token <- self.nft <- nil
      return <- token!
    }

    access(self) fun completeListing(_ payment: @FungibleToken.Vault?): @NonFungibleToken.NFT {
      let nft <- self.withdrawNFT()

      if let pay <- payment {
        // Deducting platform fees
        if let feeConfig = MelosMarketplace.getFeeConfigByTokenType(tokenType: pay.getType()) {
          feeConfig.receiver.borrow()!.deposit(from: <- pay.withdraw(amount: (pay.balance * feeConfig.makerRelayerFeePercent) + (pay.balance * feeConfig.takerRelayerFeePercent)))
        }

        // TODO: Deducting Royalties

        // Deposit the remaining amount after deducting fees and royalties to the beneficiary.
        self.details.receiver.borrow()!.deposit(from: <- pay)
      } else {
        // Should be nil
        destroy payment
      }

      return <- nft
    }

    pub fun purchaseCommon(payment: @FungibleToken.Vault): @NonFungibleToken.NFT {
      // Check listing and params
      assert(self.listingType() == ListingType.Common, message: "Listing type is not Common")
      self.ensureAvaliable()

      let payment <- self.ensurePaymentTokenType(<- payment)
      let price = self.getPrice()
      assert(payment.balance >= price, message: "insufficient payments")

      return <- self.completeListing(<- payment)
    }

    pub fun purchaseDutchAuction(payment: @FungibleToken.Vault): @NonFungibleToken.NFT {
      // Check listing and params
      assert(self.listingType() == ListingType.DutchAuction, message: "Listing type is not DutchAuction")
      self.ensureAvaliable()

      let payment <- self.ensurePaymentTokenType(<- payment)
      let price = self.getPrice()
      assert(payment.balance >= price, message: "insufficient payments")

      return <- self.completeListing(<- payment)
    }

    pub fun createOpenBid(
      bidManager: Capability<&MelosMarketplace.BidManager>,
      rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      // Check listing and params
      assert(self.listingType() == ListingType.OpenBid, message: "Listing type is not OpenBid")
      self.ensureAvaliable()

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

      emit OpenBidCreated(listingId: self.uuid, bidId: bidId, bidder: refund.address, offerPrice: offerPrice)

      return bidId
    }

    pub fun createEnglishAuctionBid(
      bidManager: Capability<&MelosMarketplace.BidManager>,
      rewardCollection: Capability<&{NonFungibleToken.CollectionPublic}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      // Check listing and params
      assert(self.listingType() == ListingType.EnglishAuction, message: "Listing type is not EnglishAuction")
      self.ensureAvaliable()
      
      let payment <- self.ensurePaymentTokenType(<- payment)

      // Already exists handle
      if let oldBidId = self.englishAuctionParticipant[refund.address] {
        let oldBid <- self.bids.remove(key: oldBidId)!
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

      let _ <- self.bids[bidId] <- bid
      destroy _;

      (self.config() as! EnglishAuction).setTopBid(newTopBid: bidRef)

      emit EnglishAuctionBidCreated(
        listingId: self.uuid, 
        bidId: bidId,
        bidder: refund.address, 
        offerPrice: offerPrice
      )

      return bidId
    }

    pub fun removeBid(bidManager: Capability<&MelosMarketplace.BidManager>, removeBidId: UInt64): Bool {
      let removeBidRef = self.getBid(removeBidId)
      assert(removeBidRef != nil, message: "Bid not exists")
      assert(bidManager.borrow()!.uuid == removeBidRef!.bidManagerId, message: "Invalid bid ownership")

      let removeBid <- self.bids.remove(key: removeBidId)!
      switch self.listingType() {
        case ListingType.EnglishAuction:
          let cfg = self.config() as! EnglishAuction
          if removeBidId == cfg.topBidId {
            cfg.setTopBid(newTopBid: self.getTopBidFromBids())
          }
          
          self.englishAuctionParticipant.remove(key: removeBid.bidder)
          emit EnglishAuctionBidRemoved(listingId: self.uuid, bidId: removeBidId)
          break
        case ListingType.OpenBid:
          emit OpenBidRemoved(listingId: self.uuid, bidId: removeBidId)
          break
      }
      destroy removeBid

      return true
    }

    pub fun completeEnglishAuction(): Bool {
      // Check listing and params
      assert(self.listingType() == ListingType.EnglishAuction, message: "Listing type is not EnglishAuction")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(self.isListingEnded(), message: "Auction is not ended")
      assert(!self.isPurchased(), message: "Listing has already been purchased")

      let cfg = self.config() as! EnglishAuction
      // The result should be 'Not traded'
      if cfg.topBidId == nil {
        let nft <- self.completeListing(nil)
        self.refund.borrow()!.deposit(token: <- nft)
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

      emit EnglishAuctionCompleted(listingId: self.uuid, bidId: bidId, winner: winner, price: price)
      return true
    }

    pub fun acceptOpenBid(listingManagerCapability: Capability<&MelosMarketplace.ListingManager>, bidId: UInt64): Bool {
      // Check listing and params
      assert(self.listingType() == ListingType.OpenBid, message: "Listing type is not EnglishAuction")
      self.ensureAvaliable()
      assert(self.getBid(bidId) != nil, message: "Bid not exists")

      let listingManager = listingManagerCapability.borrow()
      assert(listingManager != nil, message: "Cannot borrow listingManager")
      assert(listingManager!.uuid == self.details.listingManagerId, message: "Invalid listing ownership")

      let targetBid <- self.bids.remove(key: bidId)!
      let price = targetBid.payment.balance
      let winner = targetBid.refund.address
      let bidId = targetBid.uuid

      let nft <- self.completeListing(<- targetBid.payment.withdraw(amount: price))
      targetBid.rewardCollection.borrow()!.deposit(token: <- nft)
      destroy targetBid

      self.clearBids()

      emit OpenBidCompleted(listingId: self.uuid, bidId: bidId, winner: winner, price: price)
      return true
    }
  }

  pub resource interface ListingManagerPublic {
    pub fun getlistings(): {UInt64: &{ListingPublic}}
  }

  pub resource ListingManager: ListingManagerPublic {
    // Listing => Listing resource
    access(self) let listings: {UInt64: &{ListingPublic}}

    init() {
      self.listings = {}
      emit ListingManagerCreated(self.uuid)
    }

    destroy () {
      assert(self.listings.keys.length == 0, message: "There are uncompleted listings")

      emit ListingManagerDestroyed(self.uuid)
    }

    pub fun getlistings(): {UInt64: &{ListingPublic}} {
      return self.listings
    }

    pub fun getListingOwnership(_ listingId: UInt64): Bool {
      let details = MelosMarketplace.getListingDetails(listingId)
      return details == nil ? false : details!.listingManagerId == self.uuid
    }

    pub fun createListing(
      listingType: ListingType,
      nftCollection: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      nftId: UInt64,
      paymentToken: Type,
      refund: Capability<&{NonFungibleToken.CollectionPublic}>,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>
    ): UInt64 {
      let listing <- create Listing(
        listingType: listingType,
        nftCollection: nftCollection,
        nftId: nftId,
        paymentToken: paymentToken,
        refund: refund,
        listingConfig: listingConfig,
        receiver: receiver,
        listingManagerId: self.uuid
      )
      let listingId = listing.uuid

      self.listings[listingId] = &listing as &Listing
      let _ <- MelosMarketplace.listings[listingId] <- listing
      destroy _

      return listingId
    }

    pub fun removeListing(listingId: UInt64) {
      assert(MelosMarketplace.isListingExists(listingId), message: "Listing not exists")
      assert(self.getListingOwnership(listingId), message: "Invalid listing ownership")

      let listing <- MelosMarketplace.listings.remove(key: listingId)!
      destroy listing
    }

    pub fun acceptOpenBid(listingManagerCapability: Capability<&MelosMarketplace.ListingManager>, listingId: UInt64, bidId: UInt64): Bool {
      assert(MelosMarketplace.isListingExists(listingId), message: "Listing not exists")
      assert(self.getListingOwnership(listingId), message: "Invalid listing ownership")

      let listingRef = &MelosMarketplace.listings[listingId] as &Listing
      return listingRef.acceptOpenBid(listingManagerCapability: listingManagerCapability, bidId: bidId)
    }
  }
  /* --------------- ↑↑ Listings ↑↑ --------------- */
}