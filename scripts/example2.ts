import { executeScript } from "flow-js-testing";
import { ScriptRunner } from "../test/utils/script-runner";

class Runner extends ScriptRunner {
  async main() {
    this.setLogLevel(['debug', 'info', 'warning'])

    const args = [
      1337,
      true,
      "Hello, Cadence",
      "1.337",
      [1, 3, 3, 7],
      {
        name: "Cadence",
        status: "active",
      },
      42,
    ]

    const [result] = await executeScript({ name: 'log-args', args })
    console.log(result)
  }
}


new Runner().run()
