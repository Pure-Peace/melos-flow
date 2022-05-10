import {
  getAccountAddress,
  sendTransaction,
  shallPass,
  executeScript,
  shallResolve,
  shallRevert,
} from "flow-js-testing";
import * as fclLib from "@onflow/fcl"
import { createFlowEmulator } from "./utils/create-emulator";
import { Fcl } from "@rarible/fcl-types";

import { deployMelos, getMelosCount, getMelosSupply, melosAdminAddress, mintMelos, setupMelosOnAccount, transferMelos } from "./test-sdk/melos-nft";

// Increase timeout if your tests failing due to timeout
jest.setTimeout(10000);

describe("FlowToken", () => {
  createFlowEmulator({ logs: false })
  const fcl: Fcl = fclLib
  beforeEach(async () => {
  });


  it("supply should be 0 after contract is deployed", async () => {
    // Setup
    await deployMelos()

    const melosAdmin = await melosAdminAddress()
    await shallPass(setupMelosOnAccount(melosAdmin));

    const [supply] = await shallResolve(getMelosSupply())
    expect(supply).toBe(0);
  });

  it("should be able to mint a kitty item", async () => {
    // Setup
    await deployMelos()

    const Alice = await getAccountAddress("Alice");
    await setupMelosOnAccount(Alice);

    // Mint instruction for Alice account shall be resolved
    await shallPass(mintMelos(Alice));
  });

  it("should be able to create a new empty NFT Collection", async () => {
    // Setup
    await deployMelos()

    const Alice = await getAccountAddress("Alice");
    await setupMelosOnAccount(Alice);

    // shall be able te read Alice collection and ensure it's empty
    const [itemCount] = await shallResolve(getMelosCount(Alice))
    expect(itemCount).toBe(0);
  });

  it("should not be able to withdraw an NFT that doesn't exist in a collection", async () => {
    // Setup
    await deployMelos()

    const Alice = await getAccountAddress("Alice");
    const Bob = await getAccountAddress("Bob");
    await setupMelosOnAccount(Alice);
    await setupMelosOnAccount(Bob);

    // Transfer transaction shall fail for non-existent item
    await shallRevert(transferMelos(Alice, Bob, 1337));
  });

  it("should be able to withdraw an NFT and deposit to another accounts collection", async () => {
    await deployMelos()

    const Alice = await getAccountAddress("Alice");
    const Bob = await getAccountAddress("Bob");
    await setupMelosOnAccount(Alice);
    await setupMelosOnAccount(Bob);

    // Mint instruction for Alice account shall be resolved
    await shallPass(mintMelos(Alice));

    // Transfer transaction shall pass
    await shallPass(transferMelos(Alice, Bob, 0));
  });
});
