import {TxResult} from 'flow-cadut';
import {readFileSync} from 'fs';
import path from 'path';
import {BASE_PATH} from './config';

export const SEALED = 4;
export const UFIX64_PRECISION = 8;

export function toFlowAddress(value: string) {
  let hex: string;
  if (value.startsWith('0x')) {
    hex = value.substring(2).toLowerCase();
  } else {
    hex = value.toLowerCase();
  }
  const re = /[0-9a-f]{16}/g;
  if (re.test(hex)) {
    return '0x' + hex;
  } else {
    throw new Error('not an flow address: ' + value);
  }
}

export const FLOW_ZERO_ADDRESS = toFlowAddress('0x0000000000000000');

export function withPrefix(address: string): string {
  return '0x' + sansPrefix(address);
}

export function sansPrefix(address: string): string {
  return address.replace(/^0x/, '').replace(/^Fx/, '');
}

export function eventFilter<T, E>(txResult: TxResult, contract: string, contractEvent: E) {
  const filtedEvents: T[] = [];
  for (const ev of txResult.events) {
    if (ev.type.endsWith(`${contract}.${contractEvent}`)) {
      filtedEvents.push(ev.data);
    }
  }
  return filtedEvents;
}

export function getTxEvents(txResult: TxResult) {
  return txResult.events.map((ev: any) => {
    return {type: ev.type, data: ev.data};
  });
}

export async function sleep(duration: number) {
  return new Promise((r) => setTimeout(r, duration));
}

export const toUFix64 = (value?: number) =>
  [null, undefined, NaN].includes(value) ? null : value!.toFixed(UFIX64_PRECISION);

export const getCode = (filePath: string) => {
  return readFileSync(path.join(BASE_PATH, filePath.endsWith('.cdc') ? filePath : `${filePath}.cdc`), {
    encoding: 'utf-8',
  });
};

export const getCodeWithType = (file: string, type: 'contracts' | 'scripts' | 'transactions') => {
  return getCode(path.join(type, file));
};

export const contractCode = (file: string) => {
  return getCodeWithType(file, 'contracts');
};

export const scriptCode = (file: string) => {
  return getCodeWithType(file, 'scripts');
};

export const txCode = (file: string) => {
  return getCodeWithType(file, 'transactions');
};

export function assertTx<T>(response: [T, any]) {
  const [res, err] = response;
  if (err) throw new Error(err);
  return res!;
}
