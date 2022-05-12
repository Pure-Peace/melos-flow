import {createFlowEmulator, ensureTxResult, getAccount, setupProject} from './utils/helpers';
import {getMelosCount, getMelosSupply, mintMelos, setupMelosOnAccount, transferMelos} from './utils/melos-nft';

// Increase timeout if your tests failing due to timeout
jest.setTimeout(10000);

describe('Melos NFT test', () => {
  createFlowEmulator({logs: false});

  it('supply should be 0 after contract is deployed', async () => {
    await setupProject();

    ensureTxResult(await setupMelosOnAccount('emulator-account'));

    const [supply] = await getMelosSupply();
    expect(supply).toBe(0);
  });

  it('should be able to mint a MelosNFT', async () => {
    await setupProject();

    const {address} = await getAccount('alice');
    ensureTxResult(await setupMelosOnAccount(address));

    // Mint instruction for Alice account shall be resolved
    ensureTxResult(await mintMelos(address));
  });

  it('should be able to create a new empty NFT Collection', async () => {
    await setupProject();

    const {address} = await getAccount('emulator-account');
    ensureTxResult(await setupMelosOnAccount(address));

    // shall be able te read Alice collection and ensure it's empty
    const [itemCount] = ensureTxResult(await getMelosCount(address));
    expect(itemCount).toBe(0);
  });

  it("should not be able to withdraw an NFT that doesn't exist in a collection", async () => {
    await setupProject();

    const Alice = await getAccount('alice');
    const Bob = await getAccount('bob');
    await setupMelosOnAccount(Alice.address);
    await setupMelosOnAccount(Bob.address);

    // Transfer transaction shall fail for non-existent item
    const [res, err] = await transferMelos(Alice.address, Bob.address, 1337);
    expect(!!err).toBe(true);
  });

  it('should be able to withdraw an NFT and deposit to another accounts collection', async () => {
    await setupProject();

    const Alice = await getAccount('alice');
    const Bob = await getAccount('bob');
    await setupMelosOnAccount(Alice.address);
    await setupMelosOnAccount(Bob.address);

    // Mint instruction for Alice account shall be resolved
    ensureTxResult(await mintMelos(Alice.address));

    // Transfer transaction shall pass
    ensureTxResult(await transferMelos(Alice.address, Bob.address, 0));
  });
});
