import { deployContractByName } from 'flow-js-testing';
import { CONTRACTS } from '../../sdk/config';

export async function deployAll(address: string) {
  await deployContractByName({
    name: CONTRACTS.NonFungibleToken,
    to: address,
  });
}


export async function safeDeployByName(cfg: { name: string, to?: string, addressMap?: Record<string, any>, args?: any[], update?: boolean }) {
  console.log('cfg', cfg.args)
  const [result, err] = await deployContractByName({ name: cfg.name, to: cfg.to, addressMap: cfg.addressMap, args: cfg.args, update: !!cfg.update })
  if (err) {
    console.log(err)
    throw new Error(err)
  }
  return result
}
