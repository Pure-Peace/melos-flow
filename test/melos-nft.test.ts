import {emulator, assertTx, getAccount, prepareEmulator, setupProject} from './utils/helpers';
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
    await setupProject();

    assertTx(await setupCollection('emulator-account'));

    const [supply] = await totalSupply();
    expect(supply).toBe(0);
  });

  it('should be able to mint a MelosNFT', async () => {
    await setupProject();

    const {address} = await getAccount('alice');
    assertTx(await setupCollection(address));

    // Mint instruction for Alice account shall be resolved
    assertTx(await mint(address));
  });

  it('should be able to create a new empty NFT Collection', async () => {
    await setupProject();

    const {address} = await getAccount('emulator-account');
    assertTx(await setupCollection(address));

    // shall be able te read Alice collection and ensure it's empty
    const itemCount = assertTx(await balanceOf(address));
    expect(itemCount).toBe(0);
  });

  it("should not be able to withdraw an NFT that doesn't exist in a collection", async () => {
    await setupProject();

    const Alice = await getAccount('alice');
    const Bob = await getAccount('bob');
    await setupCollection(Alice.address);
    await setupCollection(Bob.address);

    // Transfer transaction shall fail for non-existent item
    const [res, err] = await transfer(Alice.address, Bob.address, 1337);
    expect(!!err).toBe(true);
  });

  it('should be able to withdraw an NFT and deposit to another accounts collection', async () => {
    await setupProject();

    const Alice = await getAccount('alice');
    const Bob = await getAccount('bob');
    await setupCollection(Alice.address);
    await setupCollection(Bob.address);

    // Mint instruction for Alice account shall be resolved
    assertTx(await mint(Alice.address));

    // Transfer transaction shall pass
    assertTx(await transfer(Alice.address, Bob.address, 0));
  });
});
