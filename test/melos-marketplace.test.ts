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
} from './utils/melos-marketplace';
import {mintFlow} from 'flow-js-testing';
import {TxResult} from 'flow-cadut';

// Increase timeout if your tests failing due to timeout
jest.setTimeout(100000);

const readyToListing = async () => {
  const melosMarketplaceIdentifier = assertTx(await getContractIdentifier());

  // Set allowed payment tokens
  const admin = await getAuthAccountByName('emulator-account');
  assertTx(await setAllowedPaymentTokens(admin));
  const allowedPaymentTokens = assertTx(await getAllowedPaymentTokens());
  console.log('allowedPaymentTokens: ', allowedPaymentTokens);
  expect(allowedPaymentTokens.length).toBeGreaterThan(0);

  const alice = await getAuthAccountByName('alice');

  // Setup NFT collection and mint NFT for alice
  assertTx(await setupCollection(alice));
  assertTx(await mint(admin, alice.address));
  const nfts = assertTx(await getAccountNFTs(alice.address));
  expect(nfts.length).toBeGreaterThan(0);

  // Setup listing manager for alice
  assertTx(await setupListingManager(alice));
  const nftId = nfts[0];

  return {nftId, alice, admin, melosMarketplaceIdentifier, allowedPaymentTokens};
};

const setupBob = async () => {
  // Mint flow to bob
  const bob = await getAuthAccountByName('bob');

  const expectBalance = 666;
  await mintFlow(bob.address, expectBalance.toFixed(8));
  const balanceBob = Number(assertTx(await getFlowBalance(bob.address)));

  console.log('bob flow balance: ', balanceBob);
  expect(balanceBob).toBeGreaterThanOrEqual(expectBalance);

  return {bob, balanceBob};
};

const checkCreateListing = async (
  seller: Account,
  melosMarketplaceIdentifier: string,
  createListingResult: TxResult
) => {
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
  const listing = assertTx(await getListingDetails(listingId));
  console.log('listingDetails: ', listing);

  return {listingCreatedEvents, aliceListingCount, listingId, listing};
};

const afterPurachasedCheck = async (
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

    const {nftId, alice, melosMarketplaceIdentifier} = await readyToListing();

    // Create listing with NFT
    const createListingResult = assertTx(
      await createListing(alice, nftId, ListingType.Common, {price: 5, listingStartTime: 1, royaltyPercent: 0})
    );
    const {listingId} = await checkCreateListing(alice, melosMarketplaceIdentifier, createListingResult);
    const {bob} = await setupBob();

    // Bob purachase listing
    const result = assertTx(await purchaseListing(bob, listingId));
    const fixedPricesListingCompleted = eventFilter<FixedPricesListingCompletedEvent, MarketplaceEvents>(
      result,
      melosMarketplaceIdentifier,
      'FixedPricesListingCompleted'
    );
    // console.log(getTxEvents(result))
    console.log('fixedPricesListingCompleted: ', fixedPricesListingCompleted);
    expect(fixedPricesListingCompleted.length).toBeGreaterThan(0);

    await afterPurachasedCheck(listingId, melosMarketplaceIdentifier, bob);
  });
});
