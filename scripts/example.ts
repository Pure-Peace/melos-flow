import { getFlowBalance } from "flow-js-testing";
import { runTransaction, waitForSeal } from "../test/utils/transaction";
import { ScriptRunner } from "../test/utils/script-runner";


const CODE = `
import FungibleToken from 0xee82856bf20e2aa6

transaction {
  prepare(account: AuthAccount) {
    log(account)
  }
}`;


class Runner extends ScriptRunner {
  async main() {
    const { fcl } = this
    const Alice = await this.getAccount('Alice')
    console.log(Alice)
    this.setLogLevel(['debug', 'info', 'warning'])

    // Type1
    /* const tx = await fcl.send([
      fcl.transaction(CODE),
      fcl.payer(Alice.auth),
      fcl.proposer(Alice.auth),
      fcl.authorizations([Alice.auth]),
      fcl.limit(999),
    ]);
    const result = await fcl.tx(tx).onceSealed(); */

    // Type2
    const tx = await runTransaction(fcl, {
      cadence: CODE
    }, Alice.auth)
    const result = await waitForSeal(fcl, tx)

    console.log(result)
  }
}


new Runner().run()
