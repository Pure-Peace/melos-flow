/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fclLib from '@onflow/fcl';
import type { Fcl } from "@rarible/fcl-types";
import { CreateFlowEmulatorParams, prepareEmulator } from "./create-emulator";
import { createEmulatorAccount } from './create-emulator-account';
import { createTestAuth } from './create-test-auth';
import { FlowAuthorizeMinter } from "./flow-service";
import { Emulator, emulator } from 'flow-js-testing';


export class BaseScriptRunner {
  fcl: Fcl;
  accounts: {
    [key: string]: {
      address: string;
      privateKey: string;
      auth: FlowAuthorizeMinter;
    }
  } = {};
  emulator: Emulator;
}


export class ScriptRunner extends BaseScriptRunner {
  public async init(params?: CreateFlowEmulatorParams, initialAccounts?: string[]) {
    this.emulator = await prepareEmulator(params)
    this.fcl = fclLib;
    if (initialAccounts) {
      console.log(`Setting up ${initialAccounts.length} accounts...`)
      for (const acc of initialAccounts) {
        await this.getAccount(acc)
      }
    }
  }

  public async getAccount(accountName: string) {
    if (this.accounts[accountName]) {
      return this.accounts[accountName]
    }

    console.log(`Add new account ${accountName}...`)
    const { address, privateKey } = await createEmulatorAccount(accountName);
    const auth = await createTestAuth(this.fcl, 'emulator', address, privateKey);
    const account = { address, privateKey, auth }
    this.accounts[accountName] = account
    return account
  }

  public async getAccounts(accountNames: string[]): Promise<{
    [key: string]: {
      address: string;
      privateKey: string;
      auth: FlowAuthorizeMinter;
    }
  }> {
    const accounts = {}
    for (const acc of accountNames) {
      accounts[acc] = await this.getAccount(acc)
    }
    return accounts
  }


  public async run(params?: CreateFlowEmulatorParams, initialAccounts?: string[]) {
    await this.before()
    await this.init(params, initialAccounts)
    try {
      await this.main()
    } catch (err) {
      console.error(err)
    }
    await this.after()
    console.log('[ScriptRunner: DONE]')
  }

  public setLogLevel(logLevel: ('debug' | 'info' | 'warning')[]) {
    this.emulator.filters = logLevel
  }

  public async before() {

  }

  public async after() {
    await emulator.stop()
  }

  public async main(): Promise<any> {

  }
}