import {emulator, deployContractsIfNotDeployed, prepareEmulator, getAuthAccountByName, SECOND} from './utils/helpers';

import {mintFlow} from 'flow-js-testing';
import {TxResult} from 'flow-cadut';
import {assertTx, eventFilter, getTxEvents} from '../sdk/common';
import {AuthAccount, Account} from '../sdk/types';

import {
  ListingCreatedEvent,
  MarketplaceEvents,
  ListingType,
  ListingRemovedEvent,
  BidCreatedEvent,
  FixedPricesListingCompletedEvent,
  BidListingCompletedEvent,
  OfferCreatedEvent,
  OfferAcceptedEvent,
} from '../sdk/type-contracts/MelosMarketplace';

import {DEFAULT_LIMIT, TESTING_ADDRESS_MAP} from '../sdk/contracts-sdk/base';
import {MelosNFTMintedEvent, MelosNFTEvents} from '../sdk/type-contracts/MelosNFT';

import {CommonSDK} from '../sdk/contracts-sdk/common';
import {MelosNFTSDK} from '../sdk/contracts-sdk/melos-nft';
import {MelosMarketplaceSDK} from '../sdk/contracts-sdk/melos-marketplace';

const TESTING_REPLACE_MAP = {
  NFT_NAME: 'MelosNFT',
  NFT_ADDRESS: '"../../contracts/MelosNFT.cdc"',
  NFT_PROVIDER_PRIVATE_PATH: '/private/MelosNFTCollectionProviderPrivatePath',
  NFT_PUBLIC_PATH: 'MelosNFT.CollectionPublicPath',
  NFT_STORAGE_PATH: 'MelosNFT.CollectionStoragePath',
  FT_NAME: 'FlowToken',
  FT_RECEIVER: '/public/flowTokenReceiver',
  FT_ADDRESS: '"../../contracts/core/FlowToken.cdc"',
  FT_STORAGE_PATH: '/storage/flowTokenVault',
};

const commonSDK = new CommonSDK(TESTING_ADDRESS_MAP);
const nftSDK = new MelosNFTSDK(TESTING_ADDRESS_MAP);
const marketplaceSDK = new MelosMarketplaceSDK(TESTING_ADDRESS_MAP, DEFAULT_LIMIT, TESTING_REPLACE_MAP);

// Increase timeout if your tests failing due to timeout
jest.setTimeout(300 * SECOND);

const setupCollectionAndMintNFT = async (account: AuthAccount) => {
  const admin = await getAuthAccountByName('emulator-account');

  // Setup NFT collection and mint NFT for account
  assertTx(await nftSDK.setupCollection(account));
  const mintResult = assertTx(await nftSDK.mint(admin, account.address));
  const nfts = assertTx(await nftSDK.getAccountNFTs(account.address));
  expect(nfts.length).toBeGreaterThan(0);

  const mintedEvents = eventFilter<MelosNFTMintedEvent, MelosNFTEvents>(mintResult, 'MelosNFT', 'Minted');
  expect(mintedEvents.length).toBeGreaterThan(0);

  return {nfts, nft: mintedEvents[0].id, mintResult};
};

const setupSeller = async (name: string) => {
  const userResult = await setupUser(name);
  const mintResult = await setupCollectionAndMintNFT(userResult.user);
  assertTx(await marketplaceSDK.setupListingManager(userResult.user));
  return {...userResult, ...mintResult};
};

const initializeMarketplace = async () => {
  const melosMarketplaceIdentifier = assertTx(await marketplaceSDK.getContractIdentifier());

  // Set allowed payment tokens
  const admin = await getAuthAccountByName('emulator-account');
  assertTx(await marketplaceSDK.setAllowedPaymentTokens(admin));
  const allowedPaymentTokens = assertTx(await marketplaceSDK.getAllowedPaymentTokens());
  console.log('allowedPaymentTokens: ', allowedPaymentTokens);
  expect(allowedPaymentTokens.length).toBeGreaterThan(0);

  return {admin, allowedPaymentTokens, melosMarketplaceIdentifier};
};

const setupUser = async (name: string, airdropFlow = 1000) => {
  // Mint flow to user
  const user = await getAuthAccountByName(name);

  await mintFlow(user.address, airdropFlow.toFixed(8));
  const balance = assertTx(await commonSDK.getFlowBalance(user.address));

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

  const aliceListingCount = assertTx(await marketplaceSDK.getAccountListingCount(seller.address));
  expect(aliceListingCount).toBeGreaterThan(0);

  const listingId = listingCreatedEvents[0].listingId;
  const listingDetails = assertTx(await marketplaceSDK.getListingDetails(listingId));
  console.log('listingDetails: ', listingDetails);

  return {listingCreatedEvents, createListingResult, aliceListingCount, listingId, listingDetails};
};

const removePurachasedListing = async (
  listingId: number,
  melosMarketplaceIdentifier: string,
  listingRemover: AuthAccount
) => {
  const listingIsPurchased = assertTx(await marketplaceSDK.getListingPurachased(listingId));

  // Listing should be purachased if listing type is not english auction
  if (!assertTx(await marketplaceSDK.getListingIsType(listingId, ListingType.EnglishAuction))) {
    expect(listingIsPurchased).toBe(true);
  }

  // Should be able to remove the listing after purachased
  const removeListingResult = assertTx(await marketplaceSDK.publicRemoveEndedListing(listingRemover, listingId));
  const removeListingEvent = eventFilter<ListingRemovedEvent, MarketplaceEvents>(
    removeListingResult,
    melosMarketplaceIdentifier,
    'ListingRemoved'
  );
  console.log('removeListingEvent: ', removeListingEvent);
  expect(removeListingEvent.length).toBeGreaterThan(0);

  // After removed, listing should be not exists
  const isListingExists = assertTx(await marketplaceSDK.getListingExists(listingId));
  expect(isListingExists).toBe(false);

  return {removeListingResult, removeListingEvent, listingIsPurchased};
};

const purachasedBalanceCheck = async (
  sellerBeforeBalance: string,
  buyerBeforeBalance: string,
  seller: Account,
  buyer: Account
) => {
  const sellerBalanceAfter = assertTx(await commonSDK.getFlowBalance(seller.address));
  const buyerBalanceAfter = assertTx(await commonSDK.getFlowBalance(buyer.address));

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
  const bidResult = assertTx(await marketplaceSDK.createBid(bidder, listingId, bidPrice));
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

const handleCreateOffer = async (
  offerer: AuthAccount,
  nftId: number,
  melosMarketplaceIdentifier: string,
  offerDuration: number,
  offerPrice: number
) => {
  const offerCreateResult = assertTx(await marketplaceSDK.createOffer(offerer, nftId, offerDuration, offerPrice));
  const offerCreateEvents = eventFilter<OfferCreatedEvent, MarketplaceEvents>(
    offerCreateResult,
    melosMarketplaceIdentifier,
    'OfferCreated'
  );
  console.log('offerCreateEvents: ', offerCreateEvents);
  expect(offerCreateEvents.length).toBeGreaterThan(0);

  const {offerId} = offerCreateEvents[0];
  const offer = assertTx(await marketplaceSDK.getOffer(offerId));

  return {offerCreateEvents, offerCreateResult, offerId, offer};
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

    assertTx(await marketplaceSDK.setupListingManager(alice));
  });

  it('Common listing tests: Create listing and purachase', async () => {
    // Deploy contracts
    await deployContractsIfNotDeployed();
    const {melosMarketplaceIdentifier} = await initializeMarketplace();

    // Setup seller and mint NFT
    const {user: alice, nft} = await setupSeller('alice');

    // Create listing with NFT
    const {listingId} = await handleCreateListing(alice, melosMarketplaceIdentifier, async () => {
      return assertTx(
        await marketplaceSDK.createListing(alice, nft, ListingType.Common, {price: 5, royaltyPercent: 0})
      );
    });

    const {user: bob, balance: bobBalanceBefore} = await setupUser('bob');

    const aliceBalanceBefore = assertTx(await commonSDK.getFlowBalance(alice.address));

    // Bob purachase listing
    const result = assertTx(await marketplaceSDK.purchaseListing(bob, listingId));
    const fixedPricesListingCompleted = eventFilter<FixedPricesListingCompletedEvent, MarketplaceEvents>(
      result,
      melosMarketplaceIdentifier,
      'FixedPricesListingCompleted'
    );
    console.log('purchase events: ', getTxEvents(result));
    console.log('fixedPricesListingCompleted: ', fixedPricesListingCompleted);
    expect(fixedPricesListingCompleted.length).toBeGreaterThan(0);

    // Check NFT ownership
    expect(assertTx(await nftSDK.getAccountHasNFT(alice.address, nft))).toEqual(false);
    expect(assertTx(await nftSDK.getAccountHasNFT(bob.address, nft))).toEqual(true);

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
        await marketplaceSDK.createListing(alice, nft, ListingType.DutchAuction, {
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

    const afterPrice = assertTx(await marketplaceSDK.getListingPrice(listingId));
    const currentBlockTime = assertTx(await commonSDK.getBlockTime());
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

    const aliceBalanceBefore = assertTx(await commonSDK.getFlowBalance(alice.address));
    const bobBalanceBefore = assertTx(await commonSDK.getFlowBalance(bob.address));

    const result = assertTx(await marketplaceSDK.purchaseListing(bob, listingId));
    const fixedPricesListingCompleted = eventFilter<FixedPricesListingCompletedEvent, MarketplaceEvents>(
      result,
      melosMarketplaceIdentifier,
      'FixedPricesListingCompleted'
    );
    console.log('[DUTCH AUCTION] purchase events: ', getTxEvents(result));
    console.log('[DUTCH AUCTION] fixedPricesListingCompleted: ', fixedPricesListingCompleted);
    expect(fixedPricesListingCompleted.length).toBeGreaterThan(0);

    // Check NFT ownership
    expect(assertTx(await nftSDK.getAccountHasNFT(alice.address, nft))).toEqual(false);
    expect(assertTx(await nftSDK.getAccountHasNFT(bob.address, nft))).toEqual(true);

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
      return assertTx(
        await marketplaceSDK.createListing(alice, nft, ListingType.OpenBid, {minimumPrice, royaltyPercent: 0})
      );
    });

    const {user: bob} = await setupUser('bob');

    // If bid amount is less than minium price, will panic
    const bidPriceLow = 4;
    const [, err] = await marketplaceSDK.createBid(bob, listingId, bidPriceLow);
    if (bidPriceLow < minimumPrice) {
      expect(err).toBeTruthy();
    }

    // Bob bid listing
    const bidPriceBob = 10;
    const bobBalanceBeforeBid1 = assertTx(await commonSDK.getFlowBalance(bob.address));
    const bobBid = await handleCreateBid(bob, listingId, bidPriceBob, melosMarketplaceIdentifier);
    expect(Number(bobBid.bidCreatedEvents[0].offerPrice)).toEqual(bidPriceBob);

    // Alex bid listing
    const {user: alex} = await setupUser('alex');
    const bidPriceAlex = 8;
    const alexBalanceBeforeBid = assertTx(await commonSDK.getFlowBalance(alex.address));
    const alexBid = await handleCreateBid(alex, listingId, bidPriceAlex, melosMarketplaceIdentifier);
    expect(Number(alexBid.bidCreatedEvents[0].offerPrice)).toEqual(bidPriceAlex);

    // Bob bid listing again
    const bidPriceBob2 = 9;
    const bobBalanceBeforeBid2 = assertTx(await commonSDK.getFlowBalance(bob.address));
    const bobBid2 = await handleCreateBid(bob, listingId, bidPriceBob2, melosMarketplaceIdentifier);
    const bobBalanceAfterBid2 = assertTx(await commonSDK.getFlowBalance(bob.address));

    // Wallet balance should change (reduce)
    expect(Number(bobBalanceAfterBid2) + bidPriceBob2).toEqual(Number(bobBalanceBeforeBid2));

    const sortedBids = assertTx(await marketplaceSDK.getListingSortedBids(listingId));
    expect(sortedBids.length).toBeGreaterThanOrEqual(3);
    console.log(`open bid listing (${listingId}) current bids (${sortedBids.length}): `, sortedBids);

    // Bob remove his second bid
    const removeBidResult = assertTx(await marketplaceSDK.removeBid(bob, listingId, bobBid2.bidId));
    const removeBidEvents = getTxEvents(removeBidResult);
    console.log('bob removeBidEvents: ', removeBidEvents);
    expect(removeBidEvents.length).toBeGreaterThanOrEqual(2); // Should exists BidRemoved event + TokensDeposit event

    // After remove bid, check current bid counts
    const sortedBids2 = assertTx(await marketplaceSDK.getListingSortedBids(listingId));
    expect(sortedBids2.length).toBeGreaterThanOrEqual(2);

    // Wallet balance should change (increase)
    const bobBalanceAfterRemoveBid2 = assertTx(await commonSDK.getFlowBalance(bob.address));
    expect(Number(bobBalanceAfterRemoveBid2)).toEqual(Number(bobBalanceBeforeBid2));

    // Alice accept bobBid1
    const aliceBalanceBeforeAcceptBid = assertTx(await commonSDK.getFlowBalance(alice.address));
    const bidAcceptResult = assertTx(await marketplaceSDK.acceptOpenBid(alice, listingId, bobBid.bidId));
    const bidListingCompletedEvents = eventFilter<BidListingCompletedEvent, MarketplaceEvents>(
      bidAcceptResult,
      melosMarketplaceIdentifier,
      'BidListingCompleted'
    );
    console.log('openbid bidListingCompletedEvents:', bidListingCompletedEvents);
    expect(bidListingCompletedEvents.length).toBeGreaterThan(0);

    // Check NFT ownership
    expect(assertTx(await nftSDK.getAccountHasNFT(alice.address, nft))).toEqual(false);
    expect(assertTx(await nftSDK.getAccountHasNFT(bob.address, nft))).toEqual(true);

    await purachasedBalanceCheck(aliceBalanceBeforeAcceptBid, bobBalanceBeforeBid1, alice, bob);

    // Alex not win, should get a refund
    const alexBalanceAfterListingEnded = assertTx(await commonSDK.getFlowBalance(alex.address));
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
        await marketplaceSDK.createListing(alice, nft, ListingType.EnglishAuction, {
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
    const [, err] = await marketplaceSDK.createBid(bob, listingId, bidPriceLow);
    if (bidPriceLow < basePrice * (1 + minimumBidPercentage)) {
      expect(err).toBeTruthy();
    }

    // Bob bid listing
    const bidPriceBob = 15;
    const bobBalanceBeforeBid = assertTx(await commonSDK.getFlowBalance(bob.address));
    const bobBid = await handleCreateBid(bob, listingId, bidPriceBob, melosMarketplaceIdentifier);
    expect(Number(bobBid.bidCreatedEvents[0].offerPrice)).toEqual(bidPriceBob);

    const bobBalanceAfterBid = assertTx(await commonSDK.getFlowBalance(bob.address));

    // Wallet balance should change (reduce)
    expect(Number(bobBalanceAfterBid) + bidPriceBob).toEqual(Number(bobBalanceBeforeBid));

    const sortedBids = assertTx(await marketplaceSDK.getListingSortedBids(listingId));
    expect(sortedBids.length).toBeGreaterThanOrEqual(1);
    console.log(`english auction listing (${listingId}) current bids (${sortedBids.length}): `, sortedBids);

    // Top shoule be bob's bid now
    const listingCurrentTopBid = assertTx(await marketplaceSDK.getListingTopBid(listingId));
    expect(listingCurrentTopBid.uuid).toEqual(bobBid.bidId);
    console.log('listingCurrentTopBid: ', listingCurrentTopBid);

    // Log new details
    const details = assertTx(await marketplaceSDK.getListingDetails(listingId));
    console.log('new listing details', details);

    // Bob try completeEnglishAuction
    const isListingEnded = assertTx(await marketplaceSDK.getListingEnded(listingId));
    const [, err1] = await marketplaceSDK.publicCompleteEnglishAuction(bob, listingId);
    // If auction is not ended, will panic
    if (!isListingEnded) {
      expect(err1).toBeTruthy();
    }

    // Alex bid listing (should be top)
    const {user: alex} = await setupUser('alex');
    const alexBeforeBalance = assertTx(await commonSDK.getFlowBalance(alex.address));
    const bidPriceAlex = bidPriceBob * 2;
    const alexBid = await handleCreateBid(alex, listingId, bidPriceAlex, melosMarketplaceIdentifier);
    expect(Number(alexBid.bidCreatedEvents[0].offerPrice)).toEqual(bidPriceAlex);

    console.log('waiting for english ended...');
    // Sleep random time for english auction ended
    // Because the emulator is inconvenient to modify the time,
    // the loop is used to perform many transactions, so that the block time changes.
    while (!assertTx(await marketplaceSDK.getListingEnded(listingId))) {
      for (let i = 0; i < 100; i++) {
        await mintFlow(alice.address, '0.1');
      }
    }

    const aliceBeforeBalance = assertTx(await commonSDK.getFlowBalance(alice.address));

    // listing ended, so bob can remove alice's listing
    // If the listing is english auction, `publicCompleteEnglishAuction` will be executed automatically
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
    expect(assertTx(await nftSDK.getAccountHasNFT(alice.address, nft))).toEqual(false);
    expect(assertTx(await nftSDK.getAccountHasNFT(bob.address, nft))).toEqual(false);
    expect(assertTx(await nftSDK.getAccountHasNFT(alex.address, nft))).toEqual(true);

    // Check balances
    await purachasedBalanceCheck(aliceBeforeBalance, alexBeforeBalance, alice, alex);

    // Bob not win, so he will get refund
    const bobBalance = assertTx(await commonSDK.getFlowBalance(bob.address));
    expect(bobBalance).toEqual(bobBalanceBeforeBid);
  });

  it('OfferAccept tests: Create offer and accept', async () => {
    // Deploy contracts
    await deployContractsIfNotDeployed();

    const {melosMarketplaceIdentifier} = await initializeMarketplace();

    // Setup NFT owner and mint NFT
    const {user: alice, nft} = await setupSeller('alice');
    const aliceBeforeBalance = assertTx(await commonSDK.getFlowBalance(alice.address));

    // Bob create offer
    const {user: bob} = await setupUser('bob');
    const offerPriceBob = 5;
    const bobOffer = await handleCreateOffer(bob, nft, melosMarketplaceIdentifier, 300, offerPriceBob);

    console.log('bobOffer: ', bobOffer.offer);

    // Alex create offer
    const {user: alex} = await setupUser('alex');
    const alexBalanceBefore = assertTx(await commonSDK.getFlowBalance(alex.address));
    const offerPriceAlex = 5;
    const alexOffer = await handleCreateOffer(alex, nft, melosMarketplaceIdentifier, 300, offerPriceAlex);

    // Alice accept alex's offer
    const offerAcceptedResult = assertTx(await marketplaceSDK.acceptOffer(alice, alexOffer.offerId));
    const offerAcceptedEvents = eventFilter<OfferAcceptedEvent, MarketplaceEvents>(
      offerAcceptedResult,
      melosMarketplaceIdentifier,
      'OfferAccepted'
    );
    console.log('offerAcceptedResult: ', offerAcceptedResult);

    // Alex will win
    expect(offerAcceptedEvents[0].offerId).toEqual(alexOffer.offerId);

    // Check NFT ownership
    expect(assertTx(await nftSDK.getAccountHasNFT(alice.address, nft))).toEqual(false);
    expect(assertTx(await nftSDK.getAccountHasNFT(bob.address, nft))).toEqual(false);
    expect(assertTx(await nftSDK.getAccountHasNFT(alex.address, nft))).toEqual(true);

    // Check balances
    await purachasedBalanceCheck(aliceBeforeBalance, alexBalanceBefore, alice, alex);

    // Check balance
    const unRefundPaymentsCount = assertTx(await marketplaceSDK.getUnRefundPaymentsCount());
    expect(unRefundPaymentsCount).toEqual(0);

    // Bob remove his offer
    const removeOfferResult = assertTx(await marketplaceSDK.removeOffer(bob, bobOffer.offerId));
    console.log('removeOfferResult: ', removeOfferResult);
  });
});
