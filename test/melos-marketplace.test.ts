import {mintFlow} from 'flow-js-testing';
import {emulator, assertTx, getAccount, setupProject, prepareEmulator, toUFix64} from './utils/helpers';
import {balanceOf, mint, setupCollection, getAccountNFTs} from './utils/melos-nft';
import {
  createListing,
  getListingCount,
  purchaseListing,
  removeListing,
  setupListingManager,
} from './utils/melos-marketplace';

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
    await setupProject();
    const {address} = await getAccount('alice');

    assertTx(await setupListingManager(address));
  });

  it('should be able to create a listing', async () => {
    // Setup
    await setupProject();
    const {address} = await getAccount('alice');
    assertTx(await setupListingManager(address));

    assertTx(await setupCollection(address));
    assertTx(await mint(address));

    const nfts = assertTx(await getAccountNFTs(address));
    console.log(nfts);
    const itemID = 0;

    // assertTx(await createListing(address));
  });

  /* it('should be able to create a listing', async () => {
    // Setup
    await setupProject();

    const {address} = await getAccount('alice');
    assertTx(await setupListingManager(address));

    assertTx(await setupCollection(address));
    assertTx(await mint(address));

    const itemID = 0;

    assertTx(await createListing(address, itemID, toUFix64(1.11)));
  });

  it('should be able to accept a listing', async () => {
    // Setup
    await setupProject();

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
    await setupProject();

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
