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

  // Marketplace manager resource
  pub let MarketplaceManagerStoragePath: StoragePath
  pub let MarketplaceManagerPublicPath: PublicPath

  pub var minimumListingDuration: UFix64?
  pub var maxAuctionDuration: UFix64?

  access(self) let listings: @{UInt64: Listing}
  access(self) var allowedPaymentTokens: [Type]
  access(self) let feeConfigs: {String: FungibleTokenFeeConfig}
  access(self) let unRefundPayments: @{String: UnRefundPayment}
  access(self) let offers: @{UInt64: Offer}

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  // Emitted when contract is initialized
  pub event MelosSettlementInitialized();

  // Marketplace manager
  pub event MarketplaceManagerCreated(id: UInt64)
  pub event MarketplaceManagerDestroyed(id: UInt64)

  // Fee events
  pub event FungibleTokenFeeUpdated(
    token: String, 
    txFeeReceiver: Address, 
    txFeePercent: UFix64,
    royaltyReceiver: Address 
  )
  pub event ListingTxFeeCutted(listingId: UInt64, txFee: UFix64?, royalty: UFix64?)
  pub event OfferAcceptFeeCutted(offerId: UInt64, txFee: UFix64?, royalty: UFix64?)
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
  pub event BidListingCompleted(listingId: UInt64, winBid: UInt64?, bidder: Address?, price: UFix64)

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
  pub event ListingRemoved(listingId: UInt64, purchased: Bool, completed: Bool)
  pub event FixedPricesListingCompleted(listingId: UInt64, payment: UFix64, buyer: Address)
  pub event FungibleTokenRefunded(balance: UFix64, receiver: Address, paymentType: Type)

  // UnrefundPayment events
  pub event UnRefundPaymentCreated(id: UInt64, managerId: UInt64)
  pub event UnRefundPaymentClaimed(id: UInt64, claimer: Address, amount: UFix64)
  pub event UnRefundPaymentDeposited(id: UInt64, amount: UFix64)
  pub event UnRefundPaymentNotify(id: UInt64, managerId: UInt64, paymentType: Type, refundAddress: Address, balance: UFix64)

  // Offer events
  pub event OfferCreated(offerId: UInt64, nftId: UInt64, offerer: Address, price: UFix64, royaltyPercent: UFix64?)
  pub event OfferAccepted(offerId: UInt64, acceptor: Address)
  pub event OfferRemoved(offerId: UInt64, completed: Bool)

  // -----------------------------------------------------------------------
  // Contract Initilization
  // -----------------------------------------------------------------------

  init () {
    self.minimumListingDuration = nil
    self.maxAuctionDuration = nil

    self.listings <- {}
    self.allowedPaymentTokens = []
    self.feeConfigs = {}
    self.unRefundPayments <- {}
    self.offers <- {}

    self.AdminStoragePath = /storage/MelosSettlementAdmin

    self.MarketplaceManagerStoragePath = /storage/MelosMarketplaceManager
    self.MarketplaceManagerPublicPath = /public/MelosMarketplaceManager

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
    if self.listings[listingId] == nil {
      return nil
    } else {
      return &self.listings[listingId] as &Listing?
    }
  }

  // Checks whether the specified offer id exists
  pub fun isOfferExists(_ offerId: UInt64): Bool {
    return self.offers[offerId] != nil
  }

  // Get the offer reference
  pub fun getOffer(_ offerId: UInt64): &Offer? {
    if self.offers[offerId] == nil {
      return nil
    } else {
      return &self.offers[offerId] as &Offer?
    }
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

  pub fun getUnRefundPaymentsCount(): Int {
    return MelosMarketplace.unRefundPayments.length
  }

  // Check if the token is allowed
  pub fun isTokenAllowed(_ token: Type): Bool {
    return self.allowedPaymentTokens.contains(token)
  }

  access(self) fun fastSort(_ arr: [AnyStruct], fn: ((AnyStruct, AnyStruct): Bool)): [AnyStruct] {
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

  pub fun encodeUnRefundPaymentsKey(_ managerId: UInt64, _ paymentType: Type): String {
    return String.encodeHex(HashAlgorithm.KECCAK_256.hash(managerId.toBigEndianBytes().concat(paymentType.identifier.utf8)))
  }

  pub fun claimUnRefundPayments(
    manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic}>, 
    paymentType: Type,
    refund: Capability<&{FungibleToken.Receiver}>
  ) {
    let managerRef = manager.borrow() ?? panic("Cannot borrow manager")
    if let unRefundPayment <- MelosMarketplace.unRefundPayments.remove(
      key: self.encodeUnRefundPaymentsKey(managerRef.uuid, paymentType)
    ) {
      unRefundPayment.claim(managerRef: managerRef, refund: refund)
      destroy unRefundPayment
    } else {
      panic("unRefundPayment are not exists")
    }
  }

  // Allow anyone to remove listings that matches the condition
  //
  // 1. listing is started
  // 2. [listing is completed] or [NFT is not avaliable] or [listing is ended]
  //
  // If the listing type is english auction, it will be done automatically when the condition is matched
  pub fun removeListing(listingId: UInt64): Bool {
    let listingRef = MelosMarketplace.getListing(listingId) ?? panic("Listing not exists")
    if listingRef.isListingStarted() 
        && (listingRef.isCompleted() 
        || !listingRef.isNFTAvaliable()
        || listingRef.isListingEnded()) {
      destroy MelosMarketplace.listings.remove(key: listingId)
      return true
    }

    return false
  }

  // Allow anyone to remove offers that has completed
  pub fun removeOffer(offerId: UInt64): Bool {
    let offerRef = MelosMarketplace.getOffer(offerId) ?? panic("Offer not exists")
    if offerRef.isCompleted() {
      destroy MelosMarketplace.offers.remove(key: offerId)
      return true
    }

    return false
  }

  access(contract) fun deductFees(
    payment: @FungibleToken.Vault, 
    royaltyPercent: UFix64?, 
    eventEmitFunction: ((UFix64?, UFix64?): Void)
  ): @FungibleToken.Vault {
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
        if let perc = royaltyPercent {
          royalty = payment.balance * perc
          royaltyReceiver.deposit(
            from: <- payment.withdraw(
              amount: royalty!
            )
          )
        }
      }
    }
    if txFee != nil || royalty != nil {
      eventEmitFunction(txFee, royalty)
    }
    return <- payment
  }

  access(contract) fun getOrCreateUnRefundPayment(managerId: UInt64, paymentType: Type): &UnRefundPayment {
    let key = self.encodeUnRefundPaymentsKey(managerId, paymentType)
    if self.unRefundPayments[key] == nil {
      let _ <- self.unRefundPayments[key] <- create UnRefundPayment(
        managerId: managerId
      )
      destroy _
    }

    return (&self.unRefundPayments[key] as &UnRefundPayment?)!
  }

  access(contract) fun tryRefunds(
    refund: Capability<&{FungibleToken.Receiver}>,
    refundAddress: Address,
    resourceId: UInt64,
    managerId: UInt64,
    payment: @FungibleToken.Vault
  ): UFix64? {
    let balance = payment.balance
    let paymentType = payment.getType()
    if balance > 0.0 {
      if let refundRef = refund.borrow() {
        refundRef.deposit(from: <- payment)
        emit FungibleTokenRefunded(balance: balance, receiver: refund.address, paymentType: paymentType)
      } else {
        let typ = payment.getType()
        let unrefundPaymentRef = self.getOrCreateUnRefundPayment(managerId: managerId, paymentType: typ)
        unrefundPaymentRef.deposit(vault: <- payment)

        let balance = unrefundPaymentRef.balance()
        emit UnRefundPaymentNotify(
          id: unrefundPaymentRef.uuid,
          managerId: managerId, 
          paymentType: typ, 
          refundAddress: refundAddress,
          balance: balance
        )
        return balance
      } 
    } else {
      destroy payment
    }
    return nil
  }

  pub fun createMarketplaceManager(): @MarketplaceManager {
    return <-create MarketplaceManager()
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
      listingDuration: UFix64?, 
      royaltyPercent: UFix64?, 
      price: UFix64
      ) {
      var listingEndTime: UFix64? = nil
      if let dur = listingDuration {
        listingEndTime = listingStartTime + dur
        assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
        assert(listingEndTime! > getCurrentBlock().timestamp, message: "Listing end time should be greater than current block time")
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
      listingDuration: UFix64?, 
      royaltyPercent: UFix64?, 
      minimumPrice: UFix64
    ) {
      var listingEndTime: UFix64? = nil
      if let dur = listingDuration {
        listingEndTime = listingStartTime + dur
        assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
        assert(listingEndTime! > getCurrentBlock().timestamp, message: "Listing end time should be greater than current block time")
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
      listingDuration: UFix64?, 
      royaltyPercent: UFix64?,
      startingPrice: UFix64, 
      reservePrice: UFix64, 
      priceCutInterval: UFix64
    ) {
      var listingEndTime: UFix64? = nil
      if let dur = listingDuration {
        listingEndTime = listingStartTime + dur
      }

      assert(startingPrice >= reservePrice, message: "Starting price must be greater than or equal with reserve price")
      assert(listingEndTime != nil, message: "Dutch auction listingEndTime must not null")
      assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
      assert(listingEndTime! > getCurrentBlock().timestamp, message: "Listing end time should be greater than current block time")
      assert((listingEndTime! - listingStartTime) > MelosMarketplace.minimumListingDuration ?? 0.0, message: "Listing duration must be greater than minimum listing duration")
      assert(priceCutInterval < (listingEndTime! - listingStartTime), message: "Dutch auction priceCutInterval must be less than listing duration")

      self.listingStartTime = listingStartTime
      self.listingEndTime = listingEndTime
      self.royaltyPercent = royaltyPercent

      self.startingPrice = startingPrice
      self.reservePrice = reservePrice
      self.priceCutInterval = priceCutInterval
    }

    pub fun getPrice(): UFix64 {
      let duration = getCurrentBlock().timestamp - self.listingStartTime
      if duration < self.priceCutInterval {
        return self.startingPrice
      }

      let diff = self.startingPrice - self.reservePrice
      let deduct = (duration - duration % self.priceCutInterval)
         * diff / (self.listingEndTime! - self.listingStartTime - self.priceCutInterval)
      
      return deduct > diff ? self.reservePrice : self.startingPrice - deduct
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
      listingDuration: UFix64?, 
      royaltyPercent: UFix64?,
      reservePrice: UFix64,
      minimumBidPercentage: UFix64,
      basePrice: UFix64
    ) {
      var listingEndTime: UFix64? = nil
      if let dur = listingDuration {
        listingEndTime = listingStartTime + dur
      }

      assert(reservePrice >= basePrice, message: "Reserve price must be greater than or equal with base price")
      assert(listingEndTime != nil, message: "English auction listingEndTime must not null")
      assert(listingEndTime! > listingStartTime, message: "Listing end time must be greater than listing start")
      assert(listingEndTime! > getCurrentBlock().timestamp, message: "Listing end time should be greater than current block time")
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
    pub let managerId: UInt64
    pub fun offerPrice(): UFix64
    pub fun bidTime(): UFix64
  }

  pub resource Bid: BidPublic {
    access(contract) let manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>
    access(contract) let rewardCollection: Capability<&{NonFungibleToken.Receiver}>
    access(contract) let refund: Capability<&{FungibleToken.Receiver}>
    access(contract) let payment: @FungibleToken.Vault

    pub let listingId: UInt64
    pub let bidder: Address
    pub let managerId: UInt64
    access(contract) var bidTimestamp: UFix64

    init(
      manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>,
      listingId: UInt64,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ) {
      assert(manager.check(), message: "Invalid manager")
      assert(rewardCollection.check(), message: "Invalid NFT reward collection")
      assert(refund.check(), message: "Invalid refund capability")

      self.manager = manager
      let managerRef = self.manager.borrow()!
      managerRef.recordBid(listingId: listingId, bidId: self.uuid)

      self.listingId = listingId

      self.rewardCollection = rewardCollection
      self.refund = refund
      self.payment <- payment

      self.bidder = self.refund.address
      self.managerId = managerRef.uuid
      self.bidTimestamp = getCurrentBlock().timestamp
    }

    pub fun offerPrice(): UFix64 {
      return self.payment.balance
    }

    pub fun bidTime(): UFix64 {
      return self.bidTimestamp
    }

    destroy() {
      let typ = self.payment.getType()
      let unRefundPaymentBalance = MelosMarketplace.tryRefunds(
        refund: self.refund, 
        refundAddress: self.bidder,
        resourceId: self.uuid, 
        managerId: self.managerId, 
        payment: <- self.payment
      )
      if let managerRef = self.manager.borrow() {
        managerRef.removeBid(listingId: self.listingId, bidId: self.uuid)
        managerRef.updateunRefundPaymentBalance(newBalance: unRefundPaymentBalance, paymentType: typ)
      }
      emit BidRemoved(listingId: self.listingId, bidId: self.uuid)
    }
  }


  // -----------------------------------------------------------------------
  // Listings
  // -----------------------------------------------------------------------

  pub struct ListingDetails {
    pub let listingType: UInt8
    pub let managerId: UInt64

    pub let nftType: Type
    pub let nftId: UInt64
    pub let nftResourceUUID: UInt64
    pub let paymentToken: Type
    pub let listingConfig: {MelosMarketplace.ListingConfig}
    pub let receiver: Capability<&{FungibleToken.Receiver}>

    pub var isPurchased: Bool
    pub var isCompleted: Bool

    init (
      listingType: ListingType,
      managerId: UInt64,
      nftType: Type,
      nftId: UInt64,
      nftResourceUUID: UInt64,
      paymentToken: Type,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>
    ) {
      self.listingType = listingType.rawValue
      self.managerId = managerId
      self.nftType = nftType
      self.nftId = nftId
      self.nftResourceUUID = nftResourceUUID
      self.paymentToken = paymentToken
      self.listingConfig = listingConfig
      self.receiver = receiver

      self.isPurchased = false
      self.isCompleted = false
    }

    pub fun getPrice(): UFix64 {
      return self.listingConfig.getPrice()
    }

    access(contract) fun setComplete(purchased: Bool) {
        assert(!self.isCompleted, message: "Listing is already completed")
        if purchased {
          self.isPurchased = true
        }
        self.isCompleted = true
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
    pub fun getListingType(): ListingType
    pub fun isNFTAvaliable(): Bool
    pub fun isListingEnded(): Bool
    pub fun isListingStarted(): Bool
    pub fun isPurchased(): Bool
    pub fun isCompleted(): Bool
    pub fun ensurePaymentTokenType(_ payment: @FungibleToken.Vault): @FungibleToken.Vault

    pub fun purchase(payment: @FungibleToken.Vault, rewardCollection: Capability<&{NonFungibleToken.Receiver}>): Bool
    pub fun createOpenBid(
      manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64
    pub fun createEnglishAuctionBid(
      manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64
    pub fun createBid(
        manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>,
        rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
        refund: Capability<&{FungibleToken.Receiver}>,
        payment: @FungibleToken.Vault
    ): UInt64
    pub fun removeBid(manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>, removeBidId: UInt64): Bool
    pub fun completeEnglishAuction(): Bool
  }

  pub resource Listing: ListingPublic {
    access(self) let details: ListingDetails
    access(self) var nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>

    // Bid id => Bid
    access(self) let bids: @{UInt64: Bid}

    // Address => bid id
    access(self) var englishAuctionParticipant: {Address: UInt64}

    init(
      listingType: ListingType,
      nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      nftId: UInt64,
      paymentToken: Type,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>,
      managerId: UInt64
    ) {
      MelosMarketplace.checkListingConfig(listingType, listingConfig)
      assert(MelosMarketplace.isTokenAllowed(paymentToken), message: "Payment tokens not allowed")
      assert(receiver.borrow() != nil, message: "Cannot borrow receiver")
      
      let txFeePercent = MelosMarketplace.getFeeConfigByTokenType(tokenType: paymentToken)?.txFeePercent ?? 0.0
      let royaltyPercent = listingConfig.royaltyPercent ?? 0.0
      assert((txFeePercent + royaltyPercent) < 1.0, message: "txFeePercent + royaltyPercent should be smaller than 100%")

      let collection = nftProvider.borrow() ?? panic("Cannot borrow NFT collection")
      let nftRef = collection.borrowNFT(id: nftId)
      assert(nftRef.id == nftId, message: "Invalid NFT id")

      let nftType = nftRef.getType()

      self.details = ListingDetails(
        listingType: listingType,
        managerId: managerId,
        nftType: nftType,
        nftId: nftId,
        nftResourceUUID: nftRef.uuid,
        paymentToken: paymentToken,
        listingConfig: listingConfig,
        receiver: receiver
      )
      self.nftProvider = nftProvider
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
        completed: self.details.isCompleted
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
        temp.append((&self.bids[bidId] as &Bid?)!)
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
      return &self.bids[bidId] as &Bid?
    }

    pub fun getDetails(): ListingDetails {
      return self.details
    }

    pub fun getPrice(): UFix64 {
      return self.details.getPrice()
    }

    pub fun getListingType(): ListingType {
      return ListingType(rawValue: self.details.listingType)!
    }

    pub fun isListingEnded(): Bool {
      if let endTime = self.config().listingEndTime {
        return getCurrentBlock().timestamp >= endTime
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

    pub fun isCompleted(): Bool {
      return self.details.isCompleted
    }

    pub fun ensurePaymentTokenType(_ payment: @FungibleToken.Vault): @FungibleToken.Vault {
      assert(payment.isInstance(self.details.paymentToken), message: "The payment token type is not the listing token type")
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

    access(self) fun completeListing(_ payment: @FungibleToken.Vault?): @NonFungibleToken.NFT? {
      if payment == nil {
        destroy payment
        self.details.setComplete(purchased: false)
        return nil
      }

      let listingId = self.uuid
      let payment <- MelosMarketplace.deductFees(
        payment: <- payment!, 
        royaltyPercent: self.details.listingConfig.royaltyPercent, 
        eventEmitFunction: fun (txFee: UFix64?, royalty: UFix64?) {
          emit ListingTxFeeCutted(listingId: listingId, txFee: txFee, royalty: royalty)
        }
      )

      // Deposit the remaining amount after deducting fees and royalties to the beneficiary.
      self.details.receiver.borrow()!.deposit(from: <- payment)

      self.details.setComplete(purchased: true)
      return <- self.nftProvider.borrow()!.withdraw(withdrawID: self.details.nftId)
    }

    pub fun purchase(payment: @FungibleToken.Vault, rewardCollection: Capability<&{NonFungibleToken.Receiver}>): Bool {
      // Check listing and params
      assert([ListingType.Common, ListingType.DutchAuction].contains(
        ListingType(rawValue: self.details.listingType)!), message: "Listing type is not supported")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(!self.isListingEnded(), message: "Listing has ended")
      assert(!self.isCompleted(), message: "Listing has already been completed")

      let reward = rewardCollection.borrow() ?? panic("Cannot borrow reward NFT collection")

      let payment <- self.ensurePaymentTokenType(<- payment)
      let paymentBalance = payment.balance
  
      let price = self.getPrice()
      assert(paymentBalance >= price, message: "insufficient payments")

      let nft <- self.completeListing(<- payment)!
      reward.deposit(token: <- nft)
      
      emit FixedPricesListingCompleted(listingId: self.uuid, payment: paymentBalance, buyer: rewardCollection.address)

      return true
    }

    pub fun createOpenBid(
      manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      // Check listing and params
      assert(self.isListingType(ListingType.OpenBid), message: "Listing type is not OpenBid")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(!self.isListingEnded(), message: "Listing has ended")
      assert(!self.isCompleted(), message: "Listing has already been completed")
  
      let payment <- self.ensurePaymentTokenType(<- payment)
      let offerPrice = payment.balance
      assert(offerPrice >= (self.config() as! OpenBid).minimumPrice, message: "Offer price must be greater than minimumPrice")

      let bid <- create Bid(
        manager: manager,
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
      manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      // Check listing and params
      assert(self.isListingType(ListingType.EnglishAuction), message: "Listing type is not EnglishAuction")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(!self.isListingEnded(), message: "Listing has ended")
      assert(!self.isCompleted(), message: "Listing has already been completed")
      
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
        manager: manager,
        listingId: self.uuid,
        rewardCollection: rewardCollection,
        refund: refund,
        payment: <- payment
      )
      let bidRef = &bid as &Bid
      let bidId = bid.uuid

      let _ <- self.bids[bidId] <- bid
      destroy _;

      (self.details.listingConfig as! EnglishAuction).setTopBid(newTopBid: bidRef)

      emit BidCreated(
        listingId: self.uuid, 
        bidId: bidId,
        bidder: refund.address, 
        offerPrice: offerPrice
      )

      return bidId
    }

    pub fun createBid(
      manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      payment: @FungibleToken.Vault
    ): UInt64 {
      switch ListingType(rawValue: self.details.listingType)! {
        case ListingType.OpenBid:
          return self.createOpenBid(
            manager: manager, 
            rewardCollection: rewardCollection, 
            refund: refund, 
            payment: <- payment
          )
        case ListingType.EnglishAuction:
          return self.createEnglishAuctionBid(
            manager: manager, 
            rewardCollection: rewardCollection, 
            refund: refund, 
            payment: <- payment
          )
      }
      panic("Listing type not support")
    }

    pub fun removeBid(manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.BidManagerPublic}>, removeBidId: UInt64): Bool {
      let removeBidRef = self.getBid(removeBidId)
      assert(removeBidRef != nil, message: "Bid not exists")
      assert(manager.borrow()!.uuid == removeBidRef!.managerId, message: "Invalid bid ownership")

      let removeBid <- self.bids.remove(key: removeBidId)!
      if self.isListingType(ListingType.EnglishAuction) {
        if removeBidId == (self.details.listingConfig as! EnglishAuction).topBidId {
          (self.details.listingConfig as! EnglishAuction).setTopBid(newTopBid: self.getTopBidFromBids())
        }
        
        self.englishAuctionParticipant.remove(key: removeBid.bidder)
      }

      destroy removeBid

      return true
    }

    pub fun acceptOpenBid(managerCapability: Capability<&MelosMarketplace.MarketplaceManager>, bidId: UInt64): Bool {
      let managerRef = managerCapability.borrow()
      assert(managerRef != nil, message: "Cannot borrow MarketplaceManager")
      assert(managerRef!.uuid == self.details.managerId, message: "Invalid listing ownership")

      return self.processAcceptOpenBid(managerRef: managerRef!, bidId: bidId)
    }

    access(contract) fun processAcceptOpenBid(managerRef: &MelosMarketplace.MarketplaceManager, bidId: UInt64): Bool {
      // Check listing and params
      assert(self.isListingType(ListingType.OpenBid), message: "Listing type is not EnglishAuction")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(!self.isListingEnded(), message: "Listing has ended")
      assert(!self.isCompleted(), message: "Listing has already been completed")
      assert(self.getBid(bidId) != nil, message: "Bid not exists")
      assert(self.details.managerId == managerRef.uuid, message: "Invalid ownership")

      let targetBid <- self.bids.remove(key: bidId)!
      let price = targetBid.payment.balance
      let bidder = targetBid.refund.address
      let bidId = targetBid.uuid

      let nft <- self.completeListing(<- targetBid.payment.withdraw(amount: price))!
      targetBid.rewardCollection.borrow()!.deposit(token: <- nft)
      destroy targetBid

      self.clearBids()

      emit BidListingCompleted(listingId: self.uuid, winBid: bidId, bidder: bidder, price: price)
      return true
    }

    pub fun completeEnglishAuction(): Bool {
      // Check listing and params
      assert(self.isListingType(ListingType.EnglishAuction), message: "Listing type is not EnglishAuction")
      assert(self.isListingStarted(), message: "Listing not started")
      assert(self.isListingEnded(), message: "English auction is not ended")
      assert(!self.isCompleted(), message: "Listing has already been completed")

      let cfg = self.config() as! EnglishAuction
  
      // The result should be 'Not traded'
      if cfg.topBidId == nil || cfg.currentPrice <= cfg.reservePrice {
        destroy self.completeListing(nil)

        emit BidListingCompleted(listingId: self.uuid, winBid: nil, bidder: nil, price: cfg.currentPrice)
        return false
      }
      
      let topBid <- self.bids.remove(key: cfg.topBidId!)!

      let price = topBid.payment.balance
      let bidder = topBid.refund.address
      let bidId = topBid.uuid

      let nft <- self.completeListing(<- topBid.payment.withdraw(amount: price))!
      topBid.rewardCollection.borrow()!.deposit(token: <- nft)

      destroy topBid
      self.clearBids()

      emit BidListingCompleted(listingId: self.uuid, winBid: bidId, bidder: bidder, price: price)
      return true
    }
  }

  // -----------------------------------------------------------------------
  // UnRefundPayment resource
  // -----------------------------------------------------------------------

  pub resource UnRefundPayment  {
    access(self) var payment: @FungibleToken.Vault?
    pub let managerId: UInt64

    init(managerId: UInt64) {
      self.payment <- nil
      self.managerId = managerId

      emit UnRefundPaymentCreated(id: self.uuid, managerId: managerId)
    }

    access(self) fun borrowPayment(): &FungibleToken.Vault? {
      return &self.payment as &FungibleToken.Vault?
    }

    pub fun balance(): UFix64 {
      let paymentRef = self.borrowPayment()
      return paymentRef == nil ? 0.0 : paymentRef!.balance
    }

    pub fun isValid(): Bool {
      return self.payment != nil && self.balance() > 0.0
    }

    access(contract) fun claim(managerRef: &{MelosMarketplace.MarketplaceManagerPublic}, refund: Capability<&{FungibleToken.Receiver}>) {
      assert(managerRef.uuid == self.managerId, message: "Invalid manager ownership")
      assert(self.isValid(), message: "No valid payment exists")

      let refundRef = refund.borrow() ?? panic("Cannot borrow refund")
      let paymentRef = self.borrowPayment() ?? panic("Connot borrow payment")

      let amount = paymentRef.balance
      let typ = self.payment.getType()

      refundRef.deposit(from: <- paymentRef.withdraw(amount: amount))
      managerRef.updateunRefundPaymentBalance(newBalance: paymentRef.balance, paymentType: typ)

      emit UnRefundPaymentClaimed(id: self.uuid, claimer: refund.address, amount: amount)
    }

    access(contract) fun deposit(vault: @FungibleToken.Vault) {
      let amount = vault.balance
      if self.payment == nil {
        let _ <- self.payment <- vault
        destroy _
      } else {
        self.borrowPayment()!.deposit(from: <- vault)
      }
      emit UnRefundPaymentDeposited(id: self.uuid, amount: amount)
    }

    destroy() {
      assert(!self.isValid(), message: "UnRefundPayment still valid, cannot destroy")
      destroy self.payment
    }
  }

  // -----------------------------------------------------------------------
  // Offer resource
  // -----------------------------------------------------------------------

  pub resource Offer {
    pub let nftId: UInt64
    pub let nftType: Type
    pub let offerStartTime: UFix64
    pub let offerEndTime: UFix64

    access(contract) let payment: @FungibleToken.Vault
    access(contract) let rewardCollection: Capability<&{NonFungibleToken.Receiver}>
    access(contract) let refund: Capability<&{FungibleToken.Receiver}>
    access(contract) let manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.OfferManagerPublic}>

    pub let offerer: Address
    pub let managerId: UInt64
    pub let royaltyPercent: UFix64?
    access(self) var completed: Bool

    init (
      nftId: UInt64,
      nftType: Type,
      offerStartTime: UFix64,
      offerDuration: UFix64,
      payment: @FungibleToken.Vault,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.OfferManagerPublic}>,
      royaltyPercent: UFix64?
    ) {
      assert(manager.check(), message: "Invalid manager Capability")
      assert(rewardCollection.check(), message: "Invalid NFT reward collection")
      assert(refund.check(), message: "Invalid refund capability")

      self.manager = manager
      let managerRef = self.manager.borrow()!
      managerRef.recordOffer(self.uuid)

      self.nftId = nftId
      self.nftType = nftType
      self.offerStartTime = offerStartTime
      self.offerEndTime = offerStartTime + offerDuration

      self.payment <- payment
      self.rewardCollection = rewardCollection
      self.refund = refund

      self.offerer = refund.address
      self.managerId = managerRef.uuid
      self.royaltyPercent = royaltyPercent

      self.completed = false

      emit OfferCreated(
        offerId: self.uuid, 
        nftId: nftId, 
        offerer: self.offerer, 
        price: self.payment.balance, 
        royaltyPercent: royaltyPercent
      )
    }

    pub fun isCompleted(): Bool {
      return self.completed
    }

    pub fun isEnded(): Bool {
      return getCurrentBlock().timestamp >= self.offerEndTime
    }

    pub fun isValid(): Bool {
      if self.rewardCollection.borrow() != nil {
        return true
      }
      return false
    }

    pub fun acceptOffer(
      nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      receiver: Capability<&{FungibleToken.Receiver}>
    ) {
      assert(!self.isEnded(), message: "Offer is already ended")
      assert(!self.completed, message: "Offer is already completed")

      let collection = nftProvider.borrow() ?? panic("Cannot borrow NFT collection")
      let nftRef = collection.borrowNFT(id: self.nftId)
      assert(nftRef.id == self.nftId, message: "Invalid NFT id")
      assert(nftRef.getType() == self.nftType, message: "Invalid NFT type")
      assert(receiver.check(), message: "Invalid reward receiver")

      self.completed = true

      let offerId = self.uuid
      let payment <- MelosMarketplace.deductFees(
        payment: <- self.payment.withdraw(amount: self.payment.balance), 
        royaltyPercent: self.royaltyPercent, 
        eventEmitFunction: fun (txFee: UFix64?, royalty: UFix64?) {
          emit OfferAcceptFeeCutted(offerId: offerId, txFee: txFee, royalty: royalty)
        }
      )
      receiver.borrow()!.deposit(from: <- payment)

      let rewardCollection = self.rewardCollection.borrow() ?? panic("Could not get NFT receiver")
      rewardCollection.deposit(token: <- collection.withdraw(withdrawID: self.nftId))

      emit OfferAccepted(offerId: self.uuid, acceptor: nftProvider.address)
    }

    destroy () {
      let typ = self.payment.getType()
      let unRefundPaymentBalance = MelosMarketplace.tryRefunds(
        refund: self.refund, 
        refundAddress: self.offerer,
        resourceId: self.uuid, 
        managerId: self.managerId, 
        payment: <- self.payment
      )
      if let managerRef = self.manager.borrow() {
        managerRef.removeOfferInner(self.uuid)
        managerRef.updateunRefundPaymentBalance(newBalance: unRefundPaymentBalance, paymentType: typ)
      }
      emit OfferRemoved(offerId: self.uuid, completed: self.isCompleted())
    }
  }

  // -----------------------------------------------------------------------
  // MarketplaceManager
  // -----------------------------------------------------------------------

  pub resource interface MarketplaceManagerPublic {
    pub fun getUnRefundPayments(): {Type: UFix64}
    access(contract) fun updateunRefundPaymentBalance(newBalance: UFix64?, paymentType: Type)
  }

  pub resource interface OfferManagerPublic {
    pub fun getOffers(): [UInt64]
    pub fun isOfferExists(_ offerId: UInt64): Bool
    pub fun findOfferIndex(_ offerId: UInt64): Int?

    access(contract) fun recordOffer(_ offerId: UInt64): Bool
    access(contract) fun removeOfferInner(_ offerId: UInt64): Bool
  }

  pub resource interface ListingManagerPublic {
    pub fun getlistings(): {UInt64: UInt64}
  }

  pub resource interface BidManagerPublic {
    pub fun getListingBids(): {UInt64: [UInt64]}
    pub fun getBidOwnership(listingId: UInt64, bidId: UInt64): Bool
    pub fun isBidExists(listingId: UInt64, bidId: UInt64): Bool 
    pub fun findBidIndex(listingId: UInt64, bidId: UInt64): Int? 
    pub fun getBidIdsWithListingId(_ listingId: UInt64): [UInt64]

    access(contract) fun recordBid(listingId: UInt64, bidId: UInt64): Bool
    access(contract) fun removeBid(listingId: UInt64, bidId: UInt64): Bool
  }

  pub resource MarketplaceManager: MarketplaceManagerPublic, ListingManagerPublic, BidManagerPublic, OfferManagerPublic  {
    // Listing => NFT id
    access(self) let listings: {UInt64: UInt64}
    // ListingId => [BidId]
    access(self) let listingBids: {UInt64: [UInt64]}
    access(self) let offers: [UInt64]

    access(self) var unRefundPayments: {Type: UFix64}

    init () {
      self.listings = {}
      self.listingBids = {}
      self.offers = []
      self.unRefundPayments = {}

      emit MarketplaceManagerCreated(id: self.uuid)
    }

    destroy() {
      assert(self.listings.keys.length == 0, message: "There are uncompleted listings")
      assert(self.offers.length == 0, message: "Still offers exists")
      for bids in self.listingBids.values {
        assert(bids.length == 0, message: "Bid records exists")
      }
      for unRefund in self.unRefundPayments.values {
        assert(unRefund == 0.0, message: "unRefundPaymentBalance not 0, please claim")
      }
      emit MarketplaceManagerDestroyed(id: self.uuid)
    }

    pub fun getUnRefundPayments(): {Type: UFix64} {
      return self.unRefundPayments
    }

    access(contract) fun updateunRefundPaymentBalance(newBalance: UFix64?, paymentType: Type) {
      if newBalance == nil {
        return
      }
      self.unRefundPayments[paymentType] = newBalance!
    }

    // -----------------------------------------------------------------------
    // Listing manager functions
    // -----------------------------------------------------------------------

    pub fun getlistings(): {UInt64: UInt64} {
      return self.listings
    }

    pub fun getListingOwnership(_ listingId: UInt64): Bool {
      if let details = MelosMarketplace.getListingDetails(listingId) {
        return details.managerId == self.uuid
      }
      return false
    }

    pub fun createListing(
      listingType: ListingType,
      nftProvider: Capability<&{NonFungibleToken.Provider, NonFungibleToken.CollectionPublic}>,
      nftId: UInt64,
      paymentToken: Type,
      listingConfig: {MelosMarketplace.ListingConfig},
      receiver: Capability<&{FungibleToken.Receiver}>
    ): UInt64 {
      let listing <- create Listing(
        listingType: listingType,
        nftProvider: nftProvider,
        nftId: nftId,
        paymentToken: paymentToken,
        listingConfig: listingConfig,
        receiver: receiver,
        managerId: self.uuid
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
      assert(listingDetails.managerId == self.uuid, message: "Invalid listing ownership")
    
      let listing <- MelosMarketplace.listings.remove(key: listingId)!
      destroy listing
    }

    pub fun acceptOpenBid(listingId: UInt64, bidId: UInt64): Bool {
      assert(MelosMarketplace.isListingExists(listingId), message: "Listing not exists")
      assert(self.getListingOwnership(listingId), message: "Invalid listing ownership")

      let listingRef = (&MelosMarketplace.listings[listingId] as &Listing?)!
      return listingRef.processAcceptOpenBid(managerRef: &self as &MarketplaceManager, bidId: bidId)
    }

    // -----------------------------------------------------------------------
    // Bid manager functions
    // -----------------------------------------------------------------------

    pub fun getListingBids(): {UInt64: [UInt64]} {
      return self.listingBids
    }

    pub fun getBidOwnership(listingId: UInt64, bidId: UInt64): Bool {
      let bidRef = MelosMarketplace.getBid(listingId: listingId, bidId: bidId)
      return bidRef == nil ? false : bidRef!.managerId == self.uuid
    }

    pub fun isBidExists(listingId: UInt64, bidId: UInt64): Bool {
      if let bids = self.listingBids[listingId] {
        if bids.contains(bidId) {
          return true
        }
      }
      return false
    }

    pub fun findBidIndex(listingId: UInt64, bidId: UInt64): Int? {
      if let bids = self.listingBids[listingId] {
        for index, id in bids {
          if id == bidId {
            return index
          }
        }
      }
      return nil
    }

    pub fun getBidIdsWithListingId(_ listingId: UInt64): [UInt64] {
      return self.listingBids[listingId] ?? []
    }

    access(contract) fun recordBid(listingId: UInt64, bidId: UInt64): Bool {
      if self.listingBids[listingId] == nil {
        self.listingBids[listingId] = [bidId]
        return true
      } else if !self.listingBids[listingId]!.contains(bidId) {
        self.listingBids[listingId]!.append(bidId)
        return true
      }
      return false
    }

    access(contract) fun removeBid(listingId: UInt64, bidId: UInt64): Bool {
      if self.listingBids[listingId] != nil {
        if let index = self.findBidIndex(listingId: listingId, bidId: bidId) {
          self.listingBids[listingId]!.remove(at: index)
          return true
        }
      }
      return false
    }

    // -----------------------------------------------------------------------
    // Offer manager functions
    // -----------------------------------------------------------------------

    pub fun getOffers(): [UInt64] {
      return self.offers
    }

    pub fun isOfferExists(_ offerId: UInt64): Bool {
      return self.offers.contains(offerId)
    }

    pub fun findOfferIndex(_ offerId: UInt64): Int? {
      for index, id in self.offers {
        if id == offerId {
          return index
        }
      }
      return nil
    }

    pub fun createOffer(
      nftId: UInt64,
      nftType: Type,
      offerStartTime: UFix64,
      offerDuration: UFix64,
      payment: @FungibleToken.Vault,
      rewardCollection: Capability<&{NonFungibleToken.Receiver}>,
      refund: Capability<&{FungibleToken.Receiver}>,
      manager: Capability<&{MelosMarketplace.MarketplaceManagerPublic, MelosMarketplace.OfferManagerPublic}>,
      royaltyPercent: UFix64?
    ): UInt64 {
      let offer <- create Offer(
        nftId: nftId,
        nftType: nftType,
        offerStartTime: offerStartTime,
        offerDuration: offerDuration,
        payment: <- payment,
        rewardCollection: rewardCollection,
        refund: refund,
        manager: manager,
        royaltyPercent: royaltyPercent
      )
      let offerId = offer.uuid
      let _ <- MelosMarketplace.offers[offerId] <- offer
      destroy _

      return offerId
    }

    pub fun removeOffer(offerId: UInt64) {
      assert(self.isOfferExists(offerId), message: "Offer not created by this manager")
      let offer <- MelosMarketplace.offers.remove(key: offerId)!
      assert(offer.managerId == self.uuid, message: "")
      destroy offer
      self.removeOfferInner(offerId)
    }

    access(contract) fun recordOffer(_ offerId: UInt64): Bool {
      if self.offers.contains(offerId) {
        return false
      } 
      self.offers.append(offerId)
      return true
    }

    access(contract) fun removeOfferInner(_ offerId: UInt64): Bool {
      if let index = self.findOfferIndex(offerId) {
        self.offers.remove(at: index)
        return true
      }

      return false
    }
  }
}