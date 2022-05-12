import {emulator, getAccountAddress, init} from 'flow-js-testing';
import {readFileSync} from 'fs';
import path from 'path';
import type {Fcl} from '@rarible/fcl-types';
import * as fclLib from '@onflow/fcl';
import {exec} from 'child_process';

import {EMULATOR_ADDRESS} from '../../sdk/config';
import {FlowService} from '../../sdk/flow-service';
import flow from '../../flow.json';
import {EMULATOR_PORT} from '../../sdk/config';
import {toFlowAddress} from '../../sdk/common';
import {TxResult} from 'flow-cadut';

const _fcl: Fcl = fclLib;

export type CreateFlowEmulatorParams = {
  logs?: boolean;
  logLevel?: ('debug' | 'info' | 'warning')[];
};

export type DeploymentsConfig = Record<
  string,
  | string
  | {
      name: string;
      args: {
        type: string;
        value: string;
      }[];
    }[]
>;

export type Account = {
  address: string;
  key: string;
};

export type AccountsConfig = Record<string, Account>;

export const BASE_PATH = path.join(__dirname, '../../cadence');

export const getCode = (filePath: string) => {
  return readFileSync(path.join(BASE_PATH, filePath.endsWith('.cdc') ? filePath : `${filePath}.cdc`), {
    encoding: 'utf-8',
  });
};

export const getCodeWithType = (file: string, type: 'contracts' | 'scripts' | 'transactions') => {
  return getCode(path.join(type, file));
};

export const contractCode = (file: string) => {
  return getCodeWithType(file, 'contracts');
};

export const scriptCode = (file: string) => {
  return getCodeWithType(file, 'scripts');
};

export const txCode = (file: string) => {
  return getCodeWithType(file, 'transactions');
};

export const ensureTxResult = (response: [TxResult | any, any]) => {
  const [res, err] = response;
  if (err) throw new Error(err);
  return [res, err];
};

export async function prepareEmulator(params: CreateFlowEmulatorParams) {
  await startEmulator(params);
  // await deployAll(withPrefix(await config().get('SERVICE_ADDRESS')));
  return emulator;
}

export function createFlowEmulator(params: CreateFlowEmulatorParams): void {
  beforeAll(async () => {
    await prepareEmulator(params);
  }, 20000);

  afterAll(async () => {
    await emulator.stop();
  }, 20000);
}

export async function startEmulator(params: CreateFlowEmulatorParams = {logs: true}): Promise<void> {
  await init(BASE_PATH);
  await emulator.start(EMULATOR_PORT, params.logs);
  if (params.logLevel && params.logLevel?.length > 0) {
    emulator.filters = params.logLevel;
  }
}

export function createTestAuth(fcl: Fcl, accountAddress: string, privateKey: string, keyIndex = 0) {
  fcl.config().put('accessNode.api', EMULATOR_ADDRESS);
  const flowService = new FlowService(fcl, accountAddress, privateKey, keyIndex);
  return flowService.authorizeMinter();
}

export function getAccountsFromFlowConfig() {
  return Object.entries(flow.accounts).map(([k, v]) => {
    return {name: k, address: v.address, key: v.key};
  });
}

export async function getAccount(name: string): Promise<Account> {
  const acc = (flow.accounts as AccountsConfig)[name];
  if (!acc) {
    return {address: await getAccountAddress(name), key: flow.accounts['emulator-account'].key};
  }
  return acc;
}

export async function getAuthAccount(name: string) {
  const {address, key} = await getAccount(name);
  return {address, key, auth: createTestAuth(_fcl, address, key)};
}

export const CHECK_PROJECT_CODE_TEMPLATE = `

transaction {
  prepare(account: AuthAccount) {
    log(account)
  }
}`;

export function buildCheckProjectCode() {
  let s = '';
  for (const account of Object.keys(flow.deployments.emulator)) {
    for (const contract of (flow.deployments.emulator as DeploymentsConfig)[account]) {
      s += `import ${typeof contract === 'string' ? contract : contract.name} from ${toFlowAddress(
        (flow.accounts as AccountsConfig)[account].address
      )}\n`;
    }
  }
  return s + CHECK_PROJECT_CODE_TEMPLATE;
}

export async function checkProjectDeployments() {
  try {
    const account = getAccountsFromFlowConfig()[0];
    const auth = await createTestAuth(_fcl, account.address, account.key);
    const tx = await _fcl.send([
      _fcl.transaction(buildCheckProjectCode()),
      _fcl.payer(auth),
      _fcl.proposer(auth),
      _fcl.authorizations([auth]),
      _fcl.limit(999),
    ]);
    const result = await _fcl.tx(tx).onceSealed();
    if (result.status !== 4) {
      return false;
    }
    return true;
  } catch (_err) {
    return false;
  }
}

export async function deployProject() {
  return new Promise((resolve, reject) => {
    exec('flow project deploy', (error, stdout, stderr) => {
      if (stdout) {
        console.log(stdout);
        return resolve(0);
      }

      if (error) {
        console.error('error: ', error);
        return reject(error);
      }

      if (stderr) {
        console.error('stderr: ', stderr);
        return reject(stderr);
      }
    });
  });
}

export async function setupProject() {
  if (!(await checkProjectDeployments())) {
    await deployProject();
  }
}
