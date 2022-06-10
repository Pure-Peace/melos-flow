import {
  emulator,
  assertTx,
  deployContractsIfNotDeployed,
  prepareEmulator,
  eventFilter,
  getAuthAccountByName,
  getTxEvents,
  Account,
  AuthAccount,
  SECOND,
  sleep,
} from './utils/helpers';
import {balanceOf, mint, setupCollection, getAccountNFTs, getAccountHasNFT} from './utils/melos-nft';
import {
  createListing,
  MarketplaceEvents,
  FixedPricesListingCompletedEvent,
  getAccountListingCount,
  getAllowedPaymentTokens,
  getContractIdentifier,
  getFlowBalance,
  getListingDetails,
  ListingCreatedEvent,
  ListingType,
  purchaseListing,
  removeListing,
  setAllowedPaymentTokens,
  setupListingManager,
  getListingPurachased,
  publicRemoveListing,
  ListingRemovedEvent,
  getListingExists,
  MelosNFTMintedEvent,
  MelosNFTEvents,
  getBlockTime,
  getListingPrice,
  createBid,
  BidCreatedEvent,
  getListingSortedBids,
  removeBid,
  acceptOpenBid,
  BidListingCompletedEvent,
  getListingNextBidMinimumPrice,
  getListingTopBid,
  publicCompleteListing,
  getListingEnded,
  getListingIsType,
} from './utils/melos-marketplace';
import {mintFlow} from 'flow-js-testing';
import {TxResult} from 'flow-cadut';

// Increase timeout if your tests failing due to timeout
jest.setTimeout(300 * SECOND);

const setupCollectionAndMintNFT = async (account: AuthAccount) => {
  const admin = await getAuthAccountByName('emulator-account');

  // Setup NFT collection and mint NFT for account
  assertTx(await setupCollection(account));
  const mintResult = assertTx(await mint(admin, account.address));
  const nfts = assertTx(await getAccountNFTs(account.address));
  expect(nfts.length).toBeGreaterThan(0);

  const mintedEvents = eventFilter<MelosNFTMintedEvent, MelosNFTEvents>(mintResult, 'MelosNFT', 'Minted');
  expect(mintedEvents.length).toBeGreaterThan(0);

  return {nfts, nft: mintedEvents[0].id, mintResult};
};

const setupSeller = async (name: string) => {
  const userResult = await setupUser(name);
  const mintResult = await setupCollectionAndMintNFT(userResult.user);
  assertTx(await setupListingManager(userResult.user));
  return {...userResult, ...mintResult};
};

const initializeMarketplace = async () => {
  const melosMarketplaceIdentifier = assertTx(await getContractIdentifier());

  // Set allowed payment tokens
  const admin = await getAuthAccountByName('emulator-account');
  assertTx(await setAllowedPaymentTokens(admin));
  const allowedPaymentTokens = assertTx(await getAllowedPaymentTokens());
  console.log('allowedPaymentTokens: ', allowedPaymentTokens);
  expect(allowedPaymentTokens.length).toBeGreaterThan(0);

  return {admin, allowedPaymentTokens, melosMarketplaceIdentifier};
};

const setupUser = async (name: string, airdropFlow = 1000) => {
  // Mint flow to user
  const user = await getAuthAccountByName(name);

  await mintFlow(user.address, airdropFlow.toFixed(8));
  const balance = assertTx(await getFlowBalance(user.address));

  console.log(`${name} flow balance: `, balance);
  expect(Number(balance)).toBeGreaterThanOrEqual(airdropFlow);

  return {user, balance};
};

const handleCreateListing = async (
  seller: Account,
  melosMarketplaceIdentifier: string,
  createListingFunction: () => Promise<TxResult>
) => {
  const createListingResult = await createListingFunction();
  const listingCreatedEvents = eventFilter<ListingCreatedEvent, MarketplaceEvents>(
    createListingResult,
    melosMarketplaceIdentifier,
    'ListingCreated'
  );
  console.log('ListingCreated events: ', listingCreatedEvents);
  expect(listingCreatedEvents.length).toBeGreaterThan(0);

  const aliceListingCount = assertTx(await getAccountListingCount(seller.address));
  expect(aliceListingCount).toBeGreaterThan(0);

  const listingId = listingCreatedEvents[0].listingId;
  const listingDetails = assertTx(await getListingDetails(listingId));
  console.log('listingDetails: ', listingDetails);

  return {listingCreatedEvents, createListingResult, aliceListingCount, listingId, listingDetails};
};

const removePurachasedListing = async (
  listingId: number,
  melosMarketplaceIdentifier: string,
  listingRemover: AuthAccount
) => {
  const listingIsPurchased = assertTx(await getListingPurachased(listingId));

  // Listing should be purachased if listing type is not english auction
  if (!assertTx(await getListingIsType(listingId, ListingType.EnglishAuction))) {
    expect(listingIsPurchased).toBe(true);
  }

  // Should be able to remove the listing after purachased
  const removeListingResult = assertTx(await publicRemoveListing(listingRemover, listingId));
  const removeListingEvent = eventFilter<ListingRemovedEvent, MarketplaceEvents>(
    removeListingResult,
    melosMarketplaceIdentifier,
    'ListingRemoved'
  );
  console.log('removeListingEvent: ', removeListingEvent);
  expect(removeListingEvent.length).toBeGreaterThan(0);

  // After removed, listing should be not exists
  const isListingExists = assertTx(await getListingExists(listingId));
  expect(isListingExists).toBe(false);

  return {removeListingResult, removeListingEvent, listingIsPurchased};
};

const purachasedBalanceCheck = async (
  sellerBeforeBalance: string,
  buyerBeforeBalance: string,
  seller: Account,
  buyer: Account
) => {
  const sellerBalanceAfter = assertTx(await getFlowBalance(seller.address));
  const buyerBalanceAfter = assertTx(await getFlowBalance(buyer.address));

  const sellerEarned = Number(sellerBalanceAfter) - Number(sellerBeforeBalance);
  const buyerSpend = Number(buyerBeforeBalance) - Number(buyerBalanceAfter);

  console.log(
    `seller BalanceBefore: ${sellerBeforeBalance}, seller BalanceAfter: ${sellerBalanceAfter} earnd: ${sellerEarned}`,
    '\n',
    `buyer BalanceBefore: ${buyerBeforeBalance}, buyer BalanceAfter: ${buyerBalanceAfter} spend: ${buyerSpend}`
  );
  expect(sellerEarned).toEqual(buyerSpend);
};

const handleCreateBid = async (
  bidder: AuthAccount,
  listingId: number,
  bidPrice: number,
  melosMarketplaceIdentifier: string
) => {
  const bidResult = assertTx(await createBid(bidder, listingId, bidPrice));
  const bidCreatedEvents = eventFilter<BidCreatedEvent, MarketplaceEvents>(
    bidResult,
    melosMarketplaceIdentifier,
    'BidCreated'
  );
  expect(bidCreatedEvents.length).toBeGreaterThan(0);

  console.log(`${bidder.name || bidder.address} bidCreatedEvent: `, bidCreatedEvents[0]);
  const bidId = bidCreatedEvents[0].bidId;

  return {bidId, bidResult, bidCreatedEvents};
};

describe('Melos marketplace tests', () => {
  beforeEach(async () => {
    await prepareEmulator({logs: false});
    return await new Promise((r) => setTimeout(r, 1000));
  });

  afterEach(async () => {
    await emulator.stop();
    return await new Promise((r) => setTimeout(r, 1000));
  });

  it('should be able to create an empty ListingManager on alice', async () => {
    // Setup
    await deployContractsIfNotDeployed();
    const alice = await getAuthAccountByName('alice');

    assertTx(await setupListingManager(alice));
  });

  it('Common listing tests: Create listing and purachase', async () => {
    // Deploy contracts
    await deployContractsIfNotDeployed();
    const {melosMarketplaceIdentifier} = await initializeMarketplace();

    // Setup seller and mint NFT
    const {user: alice, nft} = await setupSeller('alice');

    // Create listing with NFT
    const {listingId} = await handleCreateListing(alice, melosMarketplaceIdentifier, async () => {
      return assertTx(await createListing(alice, nft, ListingType.Common, {price: 5, royaltyPercent: 0}));
    });

    const {user: bob, balance: bobBalanceBefore} = await setupUser('bob');

    const aliceBalanceBefore = assertTx(await getFlowBalance(alice.address));

    // Bob purachase listing
    const result = assertTx(await purchaseListing(bob, listingId));
    const fixedPricesListingCompleted = eventFilter<FixedPricesListingCompletedEvent, MarketplaceEvents>(
      result,
      melosMarketplaceIdentifier,
      'FixedPricesListingCompleted'
    );
    console.log('purchase events: ', getTxEvents(result));
    console.log('fixedPricesListingCompleted: ', fixedPricesListingCompleted);
    expect(fixedPricesListingCompleted.length).toBeGreaterThan(0);

    // Check NFT ownership
    expect(assertTx(await getAccountHasNFT(alice.address, nft))).toEqual(false);
    expect(assertTx(await getAccountHasNFT(bob.address, nft))).toEqual(true);

    await purachasedBalanceCheck(aliceBalanceBefore, bobBalanceBefore, alice, bob);

    // listing ended, so bob can remove alice's listing
    await removePurachasedListing(listingId, melosMarketplaceIdentifier, bob);
  });

  it('DutchAuction listing tests: Create listing and purachase', async () => {
    // Deploy contracts
    await deployContractsIfNotDeployed();
    const {melosMarketplaceIdentifier} = await initializeMarketplace();

    // Setup seller and mint NFT
    const {user: alice, nft} = await setupSeller('alice');

    // Create listing with NFT
    const startingPrice = 10;
    const reservePrice = 1;
    const priceCutInterval = 1;
    const listingDuration = 60;
    const {listingId, listingDetails} = await handleCreateListing(alice, melosMarketplaceIdentifier, async () => {
      return assertTx(
        await createListing(alice, nft, ListingType.DutchAuction, {
          royaltyPercent: 0,
          startingPrice,
          listingDuration,
          reservePrice,
          priceCutInterval,
        })
      );
    });
    const listingStartTime = listingDetails.details.listingConfig.listingStartTime;

    // Bob purachase listing
    const {user: bob} = await setupUser('bob');

    // Sleep random time for dutch auction drop price
    // Because the emulator is inconvenient to modify the time,
    // the loop is used to perform many transactions, so that the block time changes.
    for (let i = 0; i < 100; i++) {
      await mintFlow(alice.address, '0.1');
    }

    const afterPrice = assertTx(await getListingPrice(listingId));
    const currentBlockTime = assertTx(await getBlockTime());
    const priceDiff = Number(startingPrice) - Number(afterPrice);
    const timeDuration = Number(currentBlockTime) - Number(listingStartTime);
    console.log(
      `[DUTCH AUCTION] startingPrice: ${startingPrice}, afterPrice: ${afterPrice}, price diff: ${priceDiff}`,
      '\n',
      `listingStartTime: ${listingStartTime}, currentBlockTime: ${currentBlockTime}, duration: ${timeDuration}s (total listing duration ${listingDuration}s)`
    );

    // If duration exists, price should dropped
    if (timeDuration > priceCutInterval) {
      expect(Number(afterPrice)).toBeLessThan(Number(startingPrice));
    }

    const aliceBalanceBefore = assertTx(await getFlowBalance(alice.address));
    const bobBalanceBefore = assertTx(await getFlowBalance(bob.address));

    const result = assertTx(await purchaseListing(bob, listingId));
    const fixedPricesListingCompleted = eventFilter<FixedPricesListingCompletedEvent, MarketplaceEvents>(
      result,
      melosMarketplaceIdentifier,
      'FixedPricesListingCompleted'
    );
    console.log('[DUTCH AUCTION] purchase events: ', getTxEvents(result));
    console.log('[DUTCH AUCTION] fixedPricesListingCompleted: ', fixedPricesListingCompleted);
    expect(fixedPricesListingCompleted.length).toBeGreaterThan(0);

    // Check NFT ownership
    expect(assertTx(await getAccountHasNFT(alice.address, nft))).toEqual(false);
    expect(assertTx(await getAccountHasNFT(bob.address, nft))).toEqual(true);

    await purachasedBalanceCheck(aliceBalanceBefore, bobBalanceBefore, alice, bob);

    // listing ended, so bob can remove alice's listing
    await removePurachasedListing(listingId, melosMarketplaceIdentifier, bob);
  });

  it('OpenBid listing tests: Create listing, bid and accept', async () => {
    // Deploy contracts
    await deployContractsIfNotDeployed();
    const {melosMarketplaceIdentifier} = await initializeMarketplace();

    // Setup seller and mint NFT
    const {user: alice, nft} = await setupSeller('alice');

    // Create listing with NFT
    const minimumPrice = 5;
    const {listingId} = await handleCreateListing(alice, melosMarketplaceIdentifier, async () => {
      return assertTx(await createListing(alice, nft, ListingType.OpenBid, {minimumPrice, royaltyPercent: 0}));
    });

    const {user: bob} = await setupUser('bob');

    // If bid amount is less than minium price, will panic
    const bidPriceLow = 4;
    const [, err] = await createBid(bob, listingId, bidPriceLow);
    if (bidPriceLow < minimumPrice) {
      expect(err).toBeTruthy();
    }

    // Bob bid listing
    const bidPriceBob = 10;
    const bobBalanceBeforeBid1 = assertTx(await getFlowBalance(bob.address));
    const bobBid = await handleCreateBid(bob, listingId, bidPriceBob, melosMarketplaceIdentifier);
    expect(Number(bobBid.bidCreatedEvents[0].offerPrice)).toEqual(bidPriceBob);

    // Alex bid listing
    const {user: alex} = await setupUser('alex');
    const bidPriceAlex = 8;
    const alexBalanceBeforeBid = assertTx(await getFlowBalance(alex.address));
    const alexBid = await handleCreateBid(alex, listingId, bidPriceAlex, melosMarketplaceIdentifier);
    expect(Number(alexBid.bidCreatedEvents[0].offerPrice)).toEqual(bidPriceAlex);

    // Bob bid listing again
    const bidPriceBob2 = 9;
    const bobBalanceBeforeBid2 = assertTx(await getFlowBalance(bob.address));
    const bobBid2 = await handleCreateBid(bob, listingId, bidPriceBob2, melosMarketplaceIdentifier);
    const bobBalanceAfterBid2 = assertTx(await getFlowBalance(bob.address));

    // Wallet balance should change (reduce)
    expect(Number(bobBalanceAfterBid2) + bidPriceBob2).toEqual(Number(bobBalanceBeforeBid2));

    const sortedBids = assertTx(await getListingSortedBids(listingId));
    expect(sortedBids.length).toBeGreaterThanOrEqual(3);
    console.log(`open bid listing (${listingId}) current bids (${sortedBids.length}): `, sortedBids);

    // Bob remove his second bid
    const removeBidResult = assertTx(await removeBid(bob, listingId, bobBid2.bidId));
    const removeBidEvents = getTxEvents(removeBidResult);
    console.log('bob removeBidEvents: ', removeBidEvents);
    expect(removeBidEvents.length).toEqual(2); // Should exists BidRemoved event + TokensDeposit event

    // After remove bid, check current bid counts
    const sortedBids2 = assertTx(await getListingSortedBids(listingId));
    expect(sortedBids2.length).toBeGreaterThanOrEqual(2);

    // Wallet balance should change (increase)
    const bobBalanceAfterRemoveBid2 = assertTx(await getFlowBalance(bob.address));
    expect(Number(bobBalanceAfterRemoveBid2)).toEqual(Number(bobBalanceBeforeBid2));

    // Alice accept bobBid1
    const aliceBalanceBeforeAcceptBid = assertTx(await getFlowBalance(alice.address));
    const bidAcceptResult = assertTx(await acceptOpenBid(alice, listingId, bobBid.bidId));
    const bidListingCompletedEvents = eventFilter<BidListingCompletedEvent, MarketplaceEvents>(
      bidAcceptResult,
      melosMarketplaceIdentifier,
      'BidListingCompleted'
    );
    console.log('openbid bidListingCompletedEvents:', bidListingCompletedEvents);
    expect(bidListingCompletedEvents.length).toBeGreaterThan(0);

    // Check NFT ownership
    expect(assertTx(await getAccountHasNFT(alice.address, nft))).toEqual(false);
    expect(assertTx(await getAccountHasNFT(bob.address, nft))).toEqual(true);

    await purachasedBalanceCheck(aliceBalanceBeforeAcceptBid, bobBalanceBeforeBid1, alice, bob);

    // Alex not win, should get a refund
    const alexBalanceAfterListingEnded = assertTx(await getFlowBalance(alex.address));
    expect(Number(alexBalanceAfterListingEnded)).toEqual(Number(alexBalanceBeforeBid));

    // listing ended, so bob can remove alice's listing
    await removePurachasedListing(listingId, melosMarketplaceIdentifier, bob);
  });

  it('EnglishAuction listing tests: Create listing, bid and complete', async () => {
    // Deploy contracts
    await deployContractsIfNotDeployed();
    const {melosMarketplaceIdentifier} = await initializeMarketplace();

    // Setup seller and mint NFT
    const {user: alice, nft} = await setupSeller('alice');

    // Create listing with NFT
    const reservePrice = 20;
    const basePrice = 10;
    const minimumBidPercentage = 0.2; // 20% minimum markup
    const listingDuration = 20; // 20s
    const {listingId} = await handleCreateListing(alice, melosMarketplaceIdentifier, async () => {
      return assertTx(
        await createListing(alice, nft, ListingType.EnglishAuction, {
          reservePrice,
          minimumBidPercentage,
          basePrice,
          listingDuration,
        })
      );
    });

    const {user: bob} = await setupUser('bob');

    // If bid amount is less than basePrice * (1 + minimumBidPercentage) , will panic
    const bidPriceLow = 5;
    const [, err] = await createBid(bob, listingId, bidPriceLow);
    if (bidPriceLow < basePrice * (1 + minimumBidPercentage)) {
      expect(err).toBeTruthy();
    }

    // Bob bid listing
    const bidPriceBob = 15;
    const bobBalanceBeforeBid = assertTx(await getFlowBalance(bob.address));
    const bobBid = await handleCreateBid(bob, listingId, bidPriceBob, melosMarketplaceIdentifier);
    expect(Number(bobBid.bidCreatedEvents[0].offerPrice)).toEqual(bidPriceBob);

    const bobBalanceAfterBid = assertTx(await getFlowBalance(bob.address));

    // Wallet balance should change (reduce)
    expect(Number(bobBalanceAfterBid) + bidPriceBob).toEqual(Number(bobBalanceBeforeBid));

    const sortedBids = assertTx(await getListingSortedBids(listingId));
    expect(sortedBids.length).toBeGreaterThanOrEqual(1);
    console.log(`english auction listing (${listingId}) current bids (${sortedBids.length}): `, sortedBids);

    // Top shoule be bob's bid now
    const listingCurrentTopBid = assertTx(await getListingTopBid(listingId));
    expect(listingCurrentTopBid.uuid).toEqual(bobBid.bidId);
    console.log('listingCurrentTopBid: ', listingCurrentTopBid);

    // Log new details
    const details = assertTx(await getListingDetails(listingId));
    console.log('new listing details', details);

    // Bob try completeEnglishAuction
    const isListingEnded = assertTx(await getListingEnded(listingId));
    const [, err1] = await publicCompleteListing(bob, listingId);
    // If auction is not ended, will panic
    if (!isListingEnded) {
      expect(err1).toBeTruthy();
    }

    // Alex bid listing (should be top)
    const {user: alex} = await setupUser('alex');
    const bidPriceAlex = bidPriceBob * 2;
    const alexBid = await handleCreateBid(alex, listingId, bidPriceAlex, melosMarketplaceIdentifier);
    expect(Number(alexBid.bidCreatedEvents[0].offerPrice)).toEqual(bidPriceAlex);

    console.log('waiting for english ended...');
    // Sleep random time for english auction ended
    // Because the emulator is inconvenient to modify the time,
    // the loop is used to perform many transactions, so that the block time changes.
    while (!assertTx(await getListingEnded(listingId))) {
      for (let i = 0; i < 100; i++) {
        await mintFlow(alice.address, '0.1');
      }
    }

    const aliceBeforeBalance = assertTx(await getFlowBalance(alice.address));

    // listing ended, so bob can remove alice's listing
    // If the listing is english auction, `publicCompleteListing` will be executed automatically
    const {removeListingResult} = await removePurachasedListing(listingId, melosMarketplaceIdentifier, bob);
    console.log('english auction removeListingResult: ', removeListingResult);

    // Get listing complete events
    const bidListingCompletedEvents = eventFilter<BidListingCompletedEvent, MarketplaceEvents>(
      removeListingResult,
      melosMarketplaceIdentifier,
      'BidListingCompleted'
    );
    console.log('english auction bidListingCompletedEvents: ', bidListingCompletedEvents);
    expect(bidListingCompletedEvents.length).toBeGreaterThan(0);

    // Alex will win
    expect(bidListingCompletedEvents[0].winBid).toEqual(alexBid.bidId);

    // Check NFT ownership
    expect(assertTx(await getAccountHasNFT(alice.address, nft))).toEqual(false);
    expect(assertTx(await getAccountHasNFT(bob.address, nft))).toEqual(false);
    expect(assertTx(await getAccountHasNFT(alex.address, nft))).toEqual(true);

    // Check balances
    await purachasedBalanceCheck(aliceBeforeBalance, bobBalanceBeforeBid, alice, alex);

    // Bob not win, so he will get refund
    const bobBalance = assertTx(await getFlowBalance(bob.address));
    expect(bobBalance).toEqual(bobBalanceBeforeBid);
  });
});
