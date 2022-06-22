import {emulator, prepareEmulator, deployContractsIfNotDeployed, getAuthAccountByName} from './utils/helpers';

import {MelosNFTSDK} from '../src/contracts-sdk/melos-nft';
import {EMULATOR_ADDRESS_MAP} from '../src/common';

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
    await (await nftSDK.setupCollection(admin.auth)).assertOk('seal');

    const supply = (await nftSDK.totalSupply()).unwrap();
    expect(supply).toBe(0);
  });

  it('should be able to mint a MelosNFT', async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    await (await nftSDK.setupCollection(alice.auth)).assertOk('seal');

    // Mint instruction for Alice account shall be resolved
    const minter = await getAuthAccountByName('emulator-account');
    await (await nftSDK.mint(minter.auth, alice.address, 1)).assertOk('seal');
  });

  it('should be able to create a new empty NFT Collection', async () => {
    await deployContractsIfNotDeployed();

    const account = await getAuthAccountByName('emulator-account');
    await (await nftSDK.setupCollection(account.auth)).assertOk('seal');

    // shall be able te read Alice collection and ensure it's empty
    const itemCount = (await nftSDK.getAccountBalance(account.address)).unwrap();
    expect(itemCount).toBe(0);
  });

  it("should not be able to withdraw an NFT that doesn't exist in a collection", async () => {
    await deployContractsIfNotDeployed();

    const alice = await getAuthAccountByName('alice');
    const bob = await getAuthAccountByName('bob');
    await nftSDK.setupCollection(alice.auth);
    await nftSDK.setupCollection(bob.auth);

    // Transfer transaction shall fail for non-existent item
    const {err} = await (await nftSDK.transfer(alice.auth, bob.address, 1337)).wait('seal');
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
    await (await nftSDK.mint(minter.auth, alice.address, 1)).assertOk('seal');

    // Transfer transaction shall pass
    await (await nftSDK.transfer(alice.auth, bob.address, 1)).assertOk('seal');
  });
});
