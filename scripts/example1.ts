import { sendTransaction } from "flow-js-testing";
import { ScriptRunner } from "../test/utils/script-runner";

class Runner extends ScriptRunner {
  async main() {
    const { Alice, Bob } = await this.getAccounts(['Alice', 'Bob'])
    console.log(Alice)
    this.setLogLevel(['debug', 'info', 'warning'])

    const [result] = await sendTransaction({ name: 'log-signers', signers: [Alice.address, Bob.address], args: ['hihihi'] })
    console.log(result)
  }
}


new Runner().run()
