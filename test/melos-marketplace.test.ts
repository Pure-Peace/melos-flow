import {mintFlow} from 'flow-js-testing';
import {
  emulator,
  assertTx,
  getAccount,
  deployContractsIfNotDeployed,
  prepareEmulator,
  toUFix64,
  eventFilter,
} from './utils/helpers';
import {balanceOf, mint, setupCollection, getAccountNFTs} from './utils/melos-nft';
import {
  createListing,
  Events,
  getAccountListingCount,
  getAllowedPaymentTokens,
  getContractIdentifier,
  getListingDetails,
  ListingCreated,
  ListingType,
  purchaseListing,
  removeListing,
  setAllowedPaymentTokens,
  setupListingManager,
} from './utils/melos-marketplace';
import {assert, Console} from 'console';

// Increase timeout if your tests failing due to timeout
jest.setTimeout(100000);

const Common = 0;
const OpenBid = 1;
const DutchAuction = 2;
const EnglishAuction = 3;

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
    const {address} = await getAccount('alice');

    assertTx(await setupListingManager(address));
  });

  it('should be able to create a listing', async () => {
    // Deploy contracts
    await deployContractsIfNotDeployed();

    const melosMarketplaceIdentifier = assertTx(await getContractIdentifier());

    // Set allowed payment tokens
    assertTx(await setAllowedPaymentTokens('emulator-account'));
    const allowedPaymentTokens = assertTx(await getAllowedPaymentTokens());
    console.log('allowedPaymentTokens: ', allowedPaymentTokens);
    expect(allowedPaymentTokens.length).toBeGreaterThan(0);

    const {address} = await getAccount('alice');

    // Setup NFT collection and mint NFT for user
    assertTx(await setupCollection(address));
    assertTx(await mint(address));
    const nfts = assertTx(await getAccountNFTs(address));
    expect(nfts.length).toBeGreaterThan(0);

    // Setup listing manager for user
    assertTx(await setupListingManager(address));

    // Create listing with NFT
    const nftId = nfts[0];
    const res = eventFilter<ListingCreated>(
      assertTx(await createListing(address, nftId, ListingType.Common, {price: 1, listingStartTime: 1})),
      melosMarketplaceIdentifier,
      Events[Events.ListingCreated]
    );
    console.log('ListingCreated events: ', res.filtedEvents);
    expect(res.filtedEvents.length).toBeGreaterThan(0);

    const aliceListingCount = assertTx(await getAccountListingCount(address));
    expect(aliceListingCount).toBeGreaterThan(0);

    const listingId = res.filtedEvents[0].listingId;
    const listing = assertTx(await getListingDetails(listingId));
    console.log('listingDetails: ', listing);
  });

  /* it('should be able to create a listing', async () => {
    // Setup
    await deployContractsIfNotDeployed();

    const {address} = await getAccount('alice');
    assertTx(await setupListingManager(address));

    assertTx(await setupCollection(address));
    assertTx(await mint(address));

    const itemID = 0;

    assertTx(await createListing(address, itemID, toUFix64(1.11)));
  });

  it('should be able to accept a listing', async () => {
    // Setup
    await deployContractsIfNotDeployed();

    // Setup seller account
    const alice = await getAccount('alice');
    assertTx(await setupListingManager(alice.address));

    assertTx(await setupCollection(alice.address));
    assertTx(await mint(alice.address));

    const itemId = 0;

    // Setup buyer account
    const bob = await getAccount('bob');
    await setupListingManager(bob.address);

    assertTx(await mintFlow(bob.address, toUFix64(100)));

    // bob shall be able to buy from alice
    const sellItemTransactionResult = assertTx(await createListing(alice.address, itemId, toUFix64(1.11)));
    const listingAvailableEvent = sellItemTransactionResult.events[0];
    const listingResourceID = listingAvailableEvent.data.listingResourceID;

    assertTx(await purchaseListing(bob.address, listingResourceID, alice.address));

    const [itemCount] = await balanceOf(bob.address);
    expect(itemCount).toBe(1);

    const [listingCount] = await balanceOf(alice.address);
    expect(listingCount).toBe(0);
  });

  it('should be able to remove a listing', async () => {
    await deployContractsIfNotDeployed();

    // Setup alice account
    const alice = await getAccount('alice');
    assertTx(await setupListingManager(alice.address));

    // Mint instruction shall pass
    assertTx(await setupCollection(alice.address));
    assertTx(await mint(alice.address));

    const itemId = 0;

    // Listing item for sale shall pass
    const sellItemTransactionResult = assertTx(await createListing(alice.address, itemId, toUFix64(1.11)));

    const listingAvailableEvent = sellItemTransactionResult.events[0];
    const listingResourceID = listingAvailableEvent.data.listingResourceID;

    // alice shall be able to remove item from sale
    assertTx(await removeListing(alice.address, listingResourceID));

    const [listingCount] = await getListingCount(alice.address);
    expect(listingCount).toBe(0);
  }); */
});
