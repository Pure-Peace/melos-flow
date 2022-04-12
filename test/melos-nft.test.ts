import {
  getAccountAddress,
  deployContractByName,
  sendTransaction,
  shallPass,
  executeScript,
  shallResolve,
} from "flow-js-testing";
import * as fclLib from "@onflow/fcl"
import { createFlowEmulator } from "./utils/create-emulator";
import { Fcl } from "@rarible/fcl-types";

// Increase timeout if your tests failing due to timeout
jest.setTimeout(10000);

describe("FlowToken", () => {
  createFlowEmulator({ logs: false })
  const fcl: Fcl = fclLib
  it("MelosNFTCreateEmptyCollection", async () => {
    const admin = await getAccountAddress("admin");
    await deployContractByName({ to: admin, name: "NonFungibleToken" });
    await deployContractByName({ to: admin, name: "MetadataViews" });
    await deployContractByName({ to: admin, name: "MelosNFT" });

    const recipient = await getAccountAddress("recipient");
    await shallPass(
      await sendTransaction({
        name: "MelosNFTCreateEmptyCollection",
        signers: [recipient],
      })
    );
    // const [result, e] = await executeScript({
    //   name: "MelosNFTGetCollection",
    //   args: [await getAccountAddress("fasdf")],
    // });
    // console.log(result, e);

    await shallResolve(
      await executeScript({
        name: "MelosNFTGetCollection",
        args: [recipient],
      })
    );
  });
});
