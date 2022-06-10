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
import {balanceOf, mint, setupCollection, getAccountNFTs} from './utils/melos-nft';
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
  // Listing should be purachased
  const listingIsPurchased = assertTx(await getListingPurachased(listingId));
  expect(listingIsPurchased).toBe(true);

  // Should be able to remove the listing after purachased
  const removeListingResult = assertTx(await publicRemoveListing(listingRemover, listingId));
  const removeListingEvent = eventFilter<ListingRemovedEvent, MarketplaceEvents>(
    removeListingResult,
    melosMarketplaceIdentifier,
    'ListingRemoved'
  );
  console.log(removeListingEvent);
  expect(removeListingEvent.length).toBeGreaterThan(0);

  // After removed, listing should be not exists
  const isListingExists = assertTx(await getListingExists(listingId));
  expect(isListingExists).toBe(false);
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

    await purachasedBalanceCheck(aliceBalanceBefore, bobBalanceBefore, alice, bob);

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

    await purachasedBalanceCheck(aliceBalanceBefore, bobBalanceBefore, alice, bob);

    await removePurachasedListing(listingId, melosMarketplaceIdentifier, bob);
  });

  /* it('OpenBid listing tests: Create listing, bid and accept', async () => {
    // Deploy contracts
    await deployContractsIfNotDeployed();
    const {melosMarketplaceIdentifier} = await initializeMarketplace();

    // Setup seller and mint NFT
    const {user: alice, nft} = await setupSeller('alice');

    // Create listing with NFT
    const {listingId} = await handleCreateListing(alice, melosMarketplaceIdentifier, async () => {
      return assertTx(await createListing(alice, nft, ListingType.OpenBid, {minimumPrice: 10, royaltyPercent: 0}));
    });

    // Bob purachase listing
    const {user: bob} = await setupUser('bob');
    const result = assertTx(await purchaseListing(bob, listingId));
    const fixedPricesListingCompleted = eventFilter<FixedPricesListingCompletedEvent, MarketplaceEvents>(
      result,
      melosMarketplaceIdentifier,
      'FixedPricesListingCompleted'
    );
    console.log('purchase events: ', getTxEvents(result));
    console.log('fixedPricesListingCompleted: ', fixedPricesListingCompleted);
    expect(fixedPricesListingCompleted.length).toBeGreaterThan(0);

    await removePurachasedListing(listingId, melosMarketplaceIdentifier, bob);
  }); */
});
