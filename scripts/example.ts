import { getFlowBalance } from "flow-js-testing";
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

    console.log(await getFlowBalance(Alice.address))

    const tx = await fcl.send([
      fcl.transaction(CODE),
      fcl.payer(Alice.auth),
      fcl.proposer(Alice.auth),
      fcl.authorizations([Alice.auth]),
      fcl.limit(999),
    ]);
    const result = await fcl.tx(tx).onceSealed();
    console.log(result)
  }
}


new Runner().run()
