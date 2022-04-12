import { deployContractByName } from 'flow-js-testing';
import { CONTRACTS } from '../../sdk/config';

export async function deployAll(address: string) {
  await deployContractByName({
    name: CONTRACTS.NonFungibleToken,
    to: address,
  });
}
