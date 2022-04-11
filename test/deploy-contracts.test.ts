import * as fclLib from "@onflow/fcl"
import type { Fcl } from "@rarible/fcl-types"
import { createTestAuth } from "./utils/create-test-auth"
import { createFlowEmulator } from "./utils/create-emulator"
import { createEmulatorAccount } from "./utils/create-emulator-account"

describe("Test auth", () => {
  createFlowEmulator({ logs: false })
  const fcl: Fcl = fclLib
  test("Should import all deployed contracts", async () => {
    const { address, privateKey } = await createEmulatorAccount("TestAccount")
    const auth = await createTestAuth(fcl, "emulator", address, privateKey)
    const tx = await fcl.send([
      fcl.transaction(CODE),
      fcl.payer(auth),
      fcl.proposer(auth),
      fcl.authorizations([auth]),
      fcl.limit(999),
    ])
    const result = await fcl.tx(tx).onceSealed()
    expect(result.status).toEqual(4)
  }, 20000)
})

const CODE = `
import NonFungibleToken from 0xf8d6e0586b0a20c7

transaction {
  prepare(account: AuthAccount) {
    log(account)
  }
}`
