import { getAccountAddress, mintFlow } from 'flow-js-testing';
import { getEmulatorPrivateKey, MINT_AMOUNT } from './config';

type EmulatorAccount = {
  address: string;
  privateKey: string;
};



export async function createEmulatorAccount(accountName: string): Promise<EmulatorAccount> {
  const address = await getAccountAddress(accountName);
  await mintFlow(address, `${MINT_AMOUNT}.1`);

  return {
    address,
    privateKey: getEmulatorPrivateKey(),
  };
}
