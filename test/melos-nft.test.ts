import {emulator, prepareEmulator, deployContractsIfNotDeployed, getAuthAccountByName} from './utils/helpers';
import {assertTx} from '../sdk/common';

import {MelosNFTSDK} from '../sdk/contracts-sdk/melos-nft';
import {EMULATOR_ADDRESS_MAP} from '../sdk/common';

const nftSDK = new MelosNFTSDK(EMULATOR_ADDRESS_MAP);

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

    const admin = await getAuthAccountByName('emulator-account');
    assertTx(await nftSDK.setupCollection(admin.auth));

    const [supply] = await nftSDK.totalSupply();
    expect(supply).toBe(0);
  });

  it('should be able to mint a MelosNFT', async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    assertTx(await nftSDK.setupCollection(alice.auth));

    // Mint instruction for Alice account shall be resolved
    const minter = await getAuthAccountByName('emulator-account');
    assertTx(await nftSDK.mint(minter.auth, alice.address));
  });

  it('should be able to create a new empty NFT Collection', async () => {
    await deployContractsIfNotDeployed();

    const account = await getAuthAccountByName('emulator-account');
    assertTx(await nftSDK.setupCollection(account.auth));

    // shall be able te read Alice collection and ensure it's empty
    const itemCount = assertTx(await nftSDK.getAccountBalance(account.address));
    expect(itemCount).toBe(0);
  });

  it("should not be able to withdraw an NFT that doesn't exist in a collection", async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    const bob = await getAuthAccountByName('bob');
    await nftSDK.setupCollection(alice.auth);
    await nftSDK.setupCollection(bob.auth);

    // Transfer transaction shall fail for non-existent item
    const [res, err] = await nftSDK.transfer(alice.auth, bob.address, 1337);
    expect(!!err).toBe(true);
  });

  it('should be able to withdraw an NFT and deposit to another accounts collection', async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    const bob = await getAuthAccountByName('bob');
    await nftSDK.setupCollection(alice.auth);
    await nftSDK.setupCollection(bob.auth);

    // Mint instruction for Alice account shall be resolved
    const minter = await getAuthAccountByName('emulator-account');
    assertTx(await nftSDK.mint(minter.auth, alice.address));

    // Transfer transaction shall pass
    assertTx(await nftSDK.transfer(alice.auth, bob.address, 0));
  });
});
