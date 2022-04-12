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
  address: string;
  privateKey: string;
  auth: FlowAuthorizeMinter;
}


export class ScriptRunner extends BaseScriptRunner {
  public async init() {
    await deployAll(withPrefix(await config().get('SERVICE_ADDRESS')));
    this.fcl = fclLib;
    const { address, privateKey } = await createEmulatorAccount('TestAccount');
    this.address = address
    this.privateKey = privateKey
    this.auth = await createTestAuth(this.fcl, 'emulator', address, privateKey);
  }

  public async run() {
    await this.before()
    await this.init()
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