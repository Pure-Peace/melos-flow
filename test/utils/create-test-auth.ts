import type { Fcl } from '@rarible/fcl-types';
import { TESTNET_ADDRESS, EMULATOR_ADDRESS } from './config';
import { FlowService } from './flow-service';

export function createTestAuth(
  fcl: Fcl,
  network: 'emulator' | 'testnet',
  accountAddress: string,
  privateKey: string,
  keyIndex = 0
) {
  fcl
    .config()
    .put('accessNode.api', network === 'testnet' ? TESTNET_ADDRESS : EMULATOR_ADDRESS);
  const flowService = new FlowService(fcl, accountAddress, privateKey, keyIndex);
  return flowService.authorizeMinter();
}
