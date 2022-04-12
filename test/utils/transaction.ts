import type { Fcl } from "@rarible/fcl-types"
import type { CommonFlowTransaction } from "@rarible/fcl-types"

export type AuthWithPrivateKey = undefined | ((account?: any) => Promise<any>)

export interface FlowTransaction extends CommonFlowTransaction {
  txId: string
}

export type MethodArgs = {
  cadence: string
  args?: any
}

export const runScript = async (
  fcl: Fcl,
  params: MethodArgs,
) => {
  const result = await fcl.send([fcl.script`${params.cadence}`, params.args])
  return await fcl.decode(result)
}

export const runTransaction = async (
  fcl: Fcl,
  params: MethodArgs,
  signature: AuthWithPrivateKey,
  gasLimit = 999,
): Promise<string> => {
  const ix = [fcl.limit(gasLimit)]
  ix.push(
    fcl.payer(signature || fcl.authz),
    fcl.proposer(signature || fcl.authz),
    fcl.authorizations([signature || fcl.authz]),
  )

  if (params.args) {
    ix.push(params.args)
  }
  ix.push(fcl.transaction(params.cadence))
  const tx = await fcl.send(ix)
  return tx.transactionId
}

export const waitForSeal = async (fcl: Fcl, txId: string): Promise<FlowTransaction> => {
  const sealed = await fcl.tx(txId).onceSealed()
  return {
    ...sealed,
    txId,
  }
}

export function subscribeForTxResult(fcl: Fcl, txId: string, cb: (tx: FlowTransaction) => void) {
  const unsub = fcl
    .tx(txId)
    .subscribe((transaction) => {
      cb({ txId, ...transaction })
      if (fcl.tx.isSealed(transaction)) {
        unsub()
      }
    })
}

export const contractAddressHex = async <T extends Record<string, any>>(fcl: Fcl<T>, label: keyof T) => {
  const contract = await fcl.config().get(label)
  return fcl.sansPrefix(contract)
}
