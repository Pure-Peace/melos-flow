import path from 'path';
import { emulator, init } from 'flow-js-testing';
import { config } from '@onflow/config';
import { deployAll } from './deploy-contracts';


export type CreateFlowEmulatorParams = {
  logs?: boolean;
  logLevel?: ('debug' | 'info' | 'warning')[]
};

export async function prepareEmulator(params: CreateFlowEmulatorParams) {
  await startEmulator(params);
  await deployAll(withPrefix(await config().get('SERVICE_ADDRESS')));
  return emulator
}

export function createFlowEmulator(params: CreateFlowEmulatorParams): void {
  beforeAll(async () => {
    await prepareEmulator(params)
  }, 20000);

  afterAll(async () => {
    await emulator.stop();
  }, 20000);
}

export function withPrefix(address: string): string {
  return '0x' + sansPrefix(address);
}

export function sansPrefix(address: string): string {
  return address.replace(/^0x/, '').replace(/^Fx/, '');
}

export async function startEmulator(params: CreateFlowEmulatorParams): Promise<void> {
  const basePath = './cadence';
  await init(basePath);
  await emulator.start(8080, params.logs);
  if (params.logLevel.length > 0) {
    emulator.filters = params.logLevel
  }
}
