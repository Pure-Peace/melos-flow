/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fclLib from '@onflow/fcl';
import type { Fcl } from "@rarible/fcl-types";
import { config } from '@onflow/config';
import { CreateFlowEmulatorParams, prepareEmulator, withPrefix } from "./create-emulator";
import { createEmulatorAccount } from './create-emulator-account';
import { createTestAuth } from './create-test-auth';
import { deployAll } from './deploy-contracts';
import { FlowAuthorizeMinter } from "./flow-service";


export class BaseScriptRunner {
  fcl: Fcl;
  accounts: {
    [key: string]: {
      address: string;
      privateKey: string;
      auth: FlowAuthorizeMinter;
    }
  } = {}
}


export class ScriptRunner extends BaseScriptRunner {
  public async init(initialAccounts?: string[]) {
    await deployAll(withPrefix(await config().get('SERVICE_ADDRESS')));
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

  public async run(initialAccounts?: string[]) {
    await this.before()
    await this.init(initialAccounts)
    try {
      await this.main()
    } catch (err) {
      console.error(err)
    }
    await this.after()
    console.log('[ScriptRunner: DONE]')
  }

  public async before() {
    throw new Error('Must override this')
  }

  public async after() {
    throw new Error('Must override this')
  }

  public async main(): Promise<any> {

  }
}