import {executeScript} from 'flow-cadut';
import {scriptCode} from '../../sdk/common';
import {UFix64} from '../../sdk/types';
import {addressMap, limit} from './config';

export async function getFlowBalance(address: string) {
  return executeScript<UFix64>({
    code: scriptCode('getFlowBalance'),
    args: [address],
    addressMap,
    limit,
  });
}
