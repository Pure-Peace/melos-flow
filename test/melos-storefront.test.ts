import {mintFlow} from 'flow-js-testing';
import {emulator, ensureTxResult, getAccount, setupProject, prepareEmulator, toUFix64} from './utils/helpers';
import {getMelosCount, mintMelos, setupMelosOnAccount} from './utils/melos-nft';
import {
  createListing,
  getListingCount,
  purchaseListing,
  removeListing,
  setupStorefrontOnAccount,
} from './utils/melos-storefront';

// Increase timeout if your tests failing due to timeout
jest.setTimeout(100000);

describe('Melos storefront test', () => {
  beforeEach(async () => {
    await prepareEmulator({logs: false});
    return await new Promise((r) => setTimeout(r, 1000));
  });

  afterEach(async () => {
    await emulator.stop();
    return await new Promise((r) => setTimeout(r, 1000));
  });

  it('should be able to create an empty Storefront', async () => {
    // Setup
    await setupProject();
    const {address} = await getAccount('alice');

    ensureTxResult(await setupStorefrontOnAccount(address));
  });

  it('should be able to create a listing', async () => {
    // Setup
    await setupProject();

    const {address} = await getAccount('alice');
    ensureTxResult(await setupStorefrontOnAccount(address));

    ensureTxResult(await setupMelosOnAccount(address));
    ensureTxResult(await mintMelos(address));

    const itemID = 0;

    ensureTxResult(await createListing(address, itemID, toUFix64(1.11)));
  });

  it('should be able to accept a listing', async () => {
    // Setup
    await setupProject();

    // Setup seller account
    const alice = await getAccount('alice');
    ensureTxResult(await setupStorefrontOnAccount(alice.address));

    ensureTxResult(await setupMelosOnAccount(alice.address));
    ensureTxResult(await mintMelos(alice.address));

    const itemId = 0;

    // Setup buyer account
    const bob = await getAccount('bob');
    await setupStorefrontOnAccount(bob.address);

    ensureTxResult(await mintFlow(bob.address, toUFix64(100)));

    // bob shall be able to buy from alice
    const [sellItemTransactionResult] = ensureTxResult(await createListing(alice.address, itemId, toUFix64(1.11)));
    const listingAvailableEvent = sellItemTransactionResult.events[0];
    const listingResourceID = listingAvailableEvent.data.listingResourceID;

    ensureTxResult(await purchaseListing(bob.address, listingResourceID, alice.address));

    const [itemCount] = await getMelosCount(bob.address);
    expect(itemCount).toBe(1);

    const [listingCount] = await getMelosCount(alice.address);
    expect(listingCount).toBe(0);
  });

  it('should be able to remove a listing', async () => {
    await setupProject();

    // Setup alice account
    const alice = await getAccount('alice');
    ensureTxResult(await setupStorefrontOnAccount(alice.address));

    // Mint instruction shall pass
    ensureTxResult(await setupMelosOnAccount(alice.address));
    ensureTxResult(await mintMelos(alice.address));

    const itemId = 0;

    // Listing item for sale shall pass
    const [sellItemTransactionResult] = ensureTxResult(await createListing(alice.address, itemId, toUFix64(1.11)));

    const listingAvailableEvent = sellItemTransactionResult.events[0];
    const listingResourceID = listingAvailableEvent.data.listingResourceID;

    // alice shall be able to remove item from sale
    ensureTxResult(await removeListing(alice.address, listingResourceID));

    const [listingCount] = await getListingCount(alice.address);
    expect(listingCount).toBe(0);
  });
});
