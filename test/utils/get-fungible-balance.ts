import type { Fcl } from "@rarible/fcl-types"
import type { FlowCurrency, FlowNetwork } from "./common"
import { runScript } from "./transaction"
import { getBalanceCode } from "./balance"
import { CONFIGS } from "./config"

export async function getFungibleBalance(
  fcl: Fcl,
  network: FlowNetwork,
  address: string,
  currency: FlowCurrency,
): Promise<string> {
  const params = getBalanceCode(fcl, currency, address)
  return runScript(fcl, params, CONFIGS[network].mainAddressMap)
}
