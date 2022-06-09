import {emulator as _emulator, getAccountAddress, getFlowBalance, init, mintFlow} from 'flow-js-testing';
import {readFileSync} from 'fs';
import path from 'path';
import type {Fcl} from '@rarible/fcl-types';
import * as fclLib from '@onflow/fcl';
import {exec} from 'child_process';

import {EMULATOR_ADDRESS} from '../../sdk/config';
import {FlowAuthorizeMinter, FlowService} from '../../sdk/flow-service';
import flow from '../../flow.json';
import {EMULATOR_PORT} from '../../sdk/config';
import {toFlowAddress} from '../../sdk/common';
import {TxResult} from 'flow-cadut';

export const SECOND = 1000;
export const HOUR = 3600 * SECOND;
export const DAY = 24 * HOUR;

export const SEALED = 4;
export const UFIX64_PRECISION = 8;
export const MINIMUM_BALANCE = 0.001;

const _fcl: Fcl = fclLib;

export const EXISTS_ACCOUNTS = new Set();

export const emulator = _emulator;

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

export interface Account {
  name?: string;
  address: string;
  key: string;
}

export interface AuthAccount extends Account {
  auth: FlowAuthorizeMinter;
}

export type AccountsConfig = Record<string, Account>;

export const BASE_PATH = path.join(__dirname, '../../cadence');

export const toUFix64 = (value?: number) =>
  [null, undefined, NaN].includes(value) ? null : value!.toFixed(UFIX64_PRECISION);

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

export function assertTx<T>(response: [T, any]) {
  const [res, err] = response;
  if (err) throw new Error(err);
  return res!;
}

export async function prepareEmulator(params: CreateFlowEmulatorParams) {
  await startEmulator(params);
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

export function getAccountsFromFlowConfig(): Account[] {
  return Object.entries(flow.accounts).map(([k, v]) => {
    return {name: k, address: v.address, key: v.key};
  });
}

export async function getAccountByAddress(address: string): Promise<Account> {
  for (const [k, v] of Object.entries(flow.accounts)) {
    if (v.address === address) {
      const account = {name: k, address: v.address, key: v.key};
      await createAccountIfNotExists(account);
      return account;
    }
  }
  throw new Error('account not found');
}

export async function createAccountIfNotExists(account: Account) {
  if (EXISTS_ACCOUNTS.has(account.address)) {
    return;
  }
  if (account.name) {
    await getAccountAddress(account.name);
  } else {
    const balance = await getFlowBalance(account.address);
    if (Number(balance) < MINIMUM_BALANCE) {
      await mintFlow(account.address, MINIMUM_BALANCE.toFixed(8));
    }
  }
  EXISTS_ACCOUNTS.add(account.address);
}

export async function getAccount(name: string): Promise<Account> {
  const acc = (flow.accounts as AccountsConfig)[name];
  let account;
  if (!acc) {
    account = {name, address: await getAccountAddress(name), key: flow.accounts['emulator-account'].key};
  } else {
    account = {name, ...acc};
  }
  await createAccountIfNotExists(account);
  return account;
}

export async function getAuthAccountByName(name: string): Promise<AuthAccount> {
  const account = await getAccount(name);
  return {...account, auth: createTestAuth(_fcl, account.address, account.key)};
}

export async function getAuthAccountByAddress(address: string): Promise<AuthAccount> {
  const account = await getAccountByAddress(address);
  return {...account, auth: createTestAuth(_fcl, address, account.key)};
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
    if (result.status !== SEALED) {
      return false;
    }
    return true;
  } catch (_err) {
    return false;
  }
}

export async function deployProject(log = false) {
  return new Promise((resolve, reject) => {
    exec('flow project deploy', (error, stdout, stderr) => {
      if (stdout) {
        if (log) {
          console.log(stdout);
        }
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

export async function deployContractsIfNotDeployed() {
  if (!(await checkProjectDeployments())) {
    await deployProject();
  }
}

export function eventFilter<T, E>(txResult: TxResult, contract: string, contractEvent: E) {
  const filtedEvents = [];
  for (const ev of txResult.events) {
    if (ev.type.endsWith(`${contract}.${contractEvent}`)) {
      filtedEvents.push(ev.data as T);
    }
  }
  return filtedEvents;
}

export function getTxEvents(txResult: TxResult) {
  return txResult.events.map((ev: any) => {
    return {type: ev.type, data: ev.data};
  });
}

export async function sleep(duration: number) {
  return new Promise((r) => setTimeout(r, duration));
}
