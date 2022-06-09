import {
  emulator,
  assertTx,
  getAccount,
  prepareEmulator,
  deployContractsIfNotDeployed,
  getAuthAccountByName,
} from './utils/helpers';
import {balanceOf, totalSupply, mint, setupCollection, transfer} from './utils/melos-nft';

// Increase timeout if your tests failing due to timeout
jest.setTimeout(100000);

describe('Melos NFT test', () => {
  beforeEach(async () => {
    await prepareEmulator({logs: false});
    return await new Promise((r) => setTimeout(r, 1000));
  });

  afterEach(async () => {
    await emulator.stop();
    return await new Promise((r) => setTimeout(r, 1000));
  });

  it('supply should be 0 after contract is deployed', async () => {
    await deployContractsIfNotDeployed();

    assertTx(await setupCollection(await getAuthAccountByName('emulator-account')));

    const [supply] = await totalSupply();
    expect(supply).toBe(0);
  });

  it('should be able to mint a MelosNFT', async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    assertTx(await setupCollection(alice));

    // Mint instruction for Alice account shall be resolved
    const minter = await getAuthAccountByName('emulator-account');
    assertTx(await mint(minter, alice.address));
  });

  it('should be able to create a new empty NFT Collection', async () => {
    await deployContractsIfNotDeployed();

    const account = await getAuthAccountByName('emulator-account');
    assertTx(await setupCollection(account));

    // shall be able te read Alice collection and ensure it's empty
    const itemCount = assertTx(await balanceOf(account.address));
    expect(itemCount).toBe(0);
  });

  it("should not be able to withdraw an NFT that doesn't exist in a collection", async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    const bob = await getAuthAccountByName('bob');
    await setupCollection(alice);
    await setupCollection(bob);

    // Transfer transaction shall fail for non-existent item
    const [res, err] = await transfer(alice, bob.address, 1337);
    expect(!!err).toBe(true);
  });

  it('should be able to withdraw an NFT and deposit to another accounts collection', async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    const bob = await getAuthAccountByName('bob');
    await setupCollection(alice);
    await setupCollection(bob);

    // Mint instruction for Alice account shall be resolved
    const minter = await getAuthAccountByName('emulator-account');
    assertTx(await mint(minter, alice.address));

    // Transfer transaction shall pass
    assertTx(await transfer(alice, bob.address, 0));
  });
});
