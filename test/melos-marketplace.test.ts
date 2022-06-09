import {
  emulator,
  assertTx,
  getAccount,
  deployContractsIfNotDeployed,
  prepareEmulator,
  toUFix64,
  eventFilter,
  getAuthAccountByName,
} from './utils/helpers';
import {balanceOf, mint, setupCollection, getAccountNFTs} from './utils/melos-nft';
import {
  createListing,
  Events,
  getAccountListingCount,
  getAllowedPaymentTokens,
  getContractIdentifier,
  getFlowBalance,
  getListingDetails,
  ListingCreated,
  ListingType,
  purchaseListing,
  removeListing,
  setAllowedPaymentTokens,
  setupListingManager,
} from './utils/melos-marketplace';
import {assert, Console} from 'console';
import {getAccountAddress, mintFlow} from 'flow-js-testing';

// Increase timeout if your tests failing due to timeout
jest.setTimeout(100000);

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

    // Create listing with NFT
    const nftId = nfts[0];
    const res = eventFilter<ListingCreated>(
      assertTx(await createListing(alice, nftId, ListingType.Common, {price: 5, listingStartTime: 1})),
      melosMarketplaceIdentifier,
      Events[Events.ListingCreated]
    );
    console.log('ListingCreated events: ', res.filtedEvents);
    expect(res.filtedEvents.length).toBeGreaterThan(0);

    const aliceListingCount = assertTx(await getAccountListingCount(alice.address));
    expect(aliceListingCount).toBeGreaterThan(0);

    const listingId = res.filtedEvents[0].listingId;
    const listing = assertTx(await getListingDetails(listingId));
    console.log('listingDetails: ', listing);

    // Mint flow to bob
    const bob = await getAuthAccountByName('bob');
    await getAccountAddress('bob'); // Fix flow-jest-test bug

    const expectBalance = 666;
    await mintFlow(bob.address, expectBalance.toFixed(8));
    const balanceBob = Number(assertTx(await getFlowBalance(bob.address)));

    console.log('bob flow balance: ', balanceBob);
    expect(balanceBob).toBeGreaterThanOrEqual(expectBalance);

    // Bob purachase listing
    const result = assertTx(await purchaseListing(bob, listingId));
    console.log(result);
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
