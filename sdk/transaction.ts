import {replaceImportAddresses} from './code-replacer';

export type AuthWithPrivateKey = undefined | ((account?: any) => Promise<any>);

export enum FlowTxStatus {
  UNKNOWN = 0,
  PENDING = 1,
  FINALIZED = 2,
  EXECUTED = 3,
  SEALED = 4,
  EXPIRED = 5,
}

export type TransactionEvent = {
  type: string;
  [key: string]: any;
};

export type CommonFlowTransaction = {
  status: FlowTxStatus;
  statusCode: number;
  errorMessage: string;
  events: TransactionEvent[];
};
export interface FlowTransaction extends CommonFlowTransaction {
  txId: string;
}

export type MethodArgs = {
  cadence: string;
  args?: any;
};

export const runScript = async (fcl: any, params: MethodArgs, addressMap?: Record<string, string>) => {
  const cadence = replaceImportAddresses(params.cadence, addressMap);
  const result = await fcl.send([fcl.script`${cadence}`, params.args]);
  return await fcl.decode(result);
};

export const runTransaction = async (
  fcl: any,
  params: MethodArgs,
  signature: AuthWithPrivateKey,
  addressMap?: Record<string, string>,
  gasLimit = 999
): Promise<string> => {
  const code = replaceImportAddresses(params.cadence, addressMap);
  const ix = [fcl.limit(gasLimit)];
  ix.push(
    fcl.payer(signature || fcl.authz),
    fcl.proposer(signature || fcl.authz),
    fcl.authorizations([signature || fcl.authz])
  );

  if (params.args) {
    ix.push(params.args);
  }
  ix.push(fcl.transaction(code));
  const tx = await fcl.send(ix);
  return tx.transactionId;
};

export const waitForSeal = async (fcl: any, txId: string): Promise<FlowTransaction> => {
  const sealed = await fcl.tx(txId).onceSealed();
  return {
    ...sealed,
    txId,
  };
};

export function subscribeForTxResult(fcl: any, txId: string, cb: (tx: FlowTransaction) => void) {
  const unsub = fcl.tx(txId).subscribe((transaction) => {
    cb({txId, ...transaction});
    if (fcl.tx.isSealed(transaction)) {
      unsub();
    }
  });
}

export const contractAddressHex = async <T extends Record<string, any>>(fcl: any, label: keyof T) => {
  const contract = await fcl.config().get(label);
  return fcl.sansPrefix(contract);
};
