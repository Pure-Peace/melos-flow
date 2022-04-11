import * as fclLib from '@onflow/fcl';
import type { Fcl } from '@rarible/fcl-types';
import { config } from '@onflow/config';

import { createTestAuth } from '../test/utils/create-test-auth';
import { startEmulator, withPrefix } from '../test/utils/create-emulator';
import { createEmulatorAccount } from '../test/utils/create-emulator-account';
import { deployAll } from '../test/utils/deploy-contracts';

async function main() {
  await startEmulator({ logs: false });
  await deployAll(withPrefix(await config().get('SERVICE_ADDRESS')));
  const fcl: Fcl = fclLib;
  const { address, privateKey } = await createEmulatorAccount('TestAccount');
  const auth = await createTestAuth(fcl, 'emulator', address, privateKey);
  const tx = await fcl.send([
    fcl.transaction(CODE),
    fcl.payer(auth),
    fcl.proposer(auth),
    fcl.authorizations([auth]),
    fcl.limit(999),
  ]);
  const result = await fcl.tx(tx).onceSealed();
  console.log(result)
}


const CODE = `
import FungibleToken from 0xee82856bf20e2aa6

transaction {
  prepare(account: AuthAccount) {
    log(account)
  }
}`;


main().then(() => { }).catch(err => { console.error(err) })
