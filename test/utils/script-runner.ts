/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fclLib from '@onflow/fcl';
import type { Fcl } from "@rarible/fcl-types";
import { CreateFlowEmulatorParams, prepareEmulator } from "./create-emulator";
import { createEmulatorAccount } from './create-emulator-account';
import { createTestAuth } from './create-test-auth';
import { FlowAuthorizeMinter } from "./flow-service";

export class BaseScriptRunner {
  fcl: Fcl;
  address: string;
  privateKey: string;
  auth: FlowAuthorizeMinter;
  emulator: any;
}


export class ScriptRunner extends BaseScriptRunner {
  public async init(params: CreateFlowEmulatorParams) {
    this.emulator = await prepareEmulator(params)
    this.fcl = fclLib;
    const { address, privateKey } = await createEmulatorAccount('TestAccount');
    this.address = address
    this.privateKey = privateKey
    this.auth = await createTestAuth(this.fcl, 'emulator', address, privateKey);
  }

  public async run(params: CreateFlowEmulatorParams) {
    await this.init(params)
    await this.main()
    await this.emulator.stop()
  }

  public async main(): Promise<any> {

  }
}