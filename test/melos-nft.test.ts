import {emulator, prepareEmulator, deployContractsIfNotDeployed, getAuthAccountByName} from './utils/helpers';
import {assertTx} from '../sdk/common';

import {MelosNFTSDK} from '../sdk/contracts-sdk/melos-nft';
import {TESTING_ADDRESS_MAP} from '../sdk/contracts-sdk/base';

const nftSDK = new MelosNFTSDK(TESTING_ADDRESS_MAP);

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

    assertTx(await nftSDK.setupCollection(await getAuthAccountByName('emulator-account')));

    const [supply] = await nftSDK.totalSupply();
    expect(supply).toBe(0);
  });

  it('should be able to mint a MelosNFT', async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    assertTx(await nftSDK.setupCollection(alice));

    // Mint instruction for Alice account shall be resolved
    const minter = await getAuthAccountByName('emulator-account');
    assertTx(await nftSDK.mint(minter, alice.address));
  });

  it('should be able to create a new empty NFT Collection', async () => {
    await deployContractsIfNotDeployed();

    const account = await getAuthAccountByName('emulator-account');
    assertTx(await nftSDK.setupCollection(account));

    // shall be able te read Alice collection and ensure it's empty
    const itemCount = assertTx(await nftSDK.getAccountBalance(account.address));
    expect(itemCount).toBe(0);
  });

  it("should not be able to withdraw an NFT that doesn't exist in a collection", async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    const bob = await getAuthAccountByName('bob');
    await nftSDK.setupCollection(alice);
    await nftSDK.setupCollection(bob);

    // Transfer transaction shall fail for non-existent item
    const [res, err] = await nftSDK.transfer(alice, bob.address, 1337);
    expect(!!err).toBe(true);
  });

  it('should be able to withdraw an NFT and deposit to another accounts collection', async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    const bob = await getAuthAccountByName('bob');
    await nftSDK.setupCollection(alice);
    await nftSDK.setupCollection(bob);

    // Mint instruction for Alice account shall be resolved
    const minter = await getAuthAccountByName('emulator-account');
    assertTx(await nftSDK.mint(minter, alice.address));

    // Transfer transaction shall pass
    assertTx(await nftSDK.transfer(alice, bob.address, 0));
  });
});
