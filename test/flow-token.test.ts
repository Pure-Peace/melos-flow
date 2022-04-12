import path from "path";
import {
  emulator,
  init,
  getAccountAddress,
  deployContractByName,
  sendTransaction,
  getContractAddress,
  shallPass,
  getFlowBalance,
  executeScript,
} from "flow-js-testing";
import * as fclLib from "@onflow/fcl"
import { createFlowEmulator } from "./utils/create-emulator";
import { Fcl } from "@rarible/fcl-types";


// Increase timeout if your tests failing due to timeout
jest.setTimeout(10000);

describe("FlowToken", () => {
  createFlowEmulator({ logs: false })
  const fcl: Fcl = fclLib
  it("FlowTokenTransfer", async () => {
    const to = await getAccountAddress("recipient");
    const before = await getFlowBalance(to);
    const amount = 88;
    await shallPass(
      await sendTransaction({
        name: "FlowTokenTransfer",
        args: [to, amount],
      })
    );
    const after = await getFlowBalance(to);
    expect(after[0] - before[0]).toBe(amount);
  });
});
