/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const { ScriptRunner } = require("../build/test/utils/script-runner")


const CODE = `
import FungibleToken from 0xee82856bf20e2aa6

transaction {
  prepare(account: AuthAccount) {
    log(account)
  }
}`;


class Runner extends ScriptRunner {
  async main() {
    const { fcl, auth } = this

    const tx = await fcl.send([
      fcl.transaction(CODE),
      fcl.payer(auth),
      fcl.proposer(auth),
      fcl.authorizations([auth]),
      fcl.limit(999),
    ]);
    const result = await fcl.tx(tx).onceSealed();
    console.log(result)
  }
}


new Runner().run()
