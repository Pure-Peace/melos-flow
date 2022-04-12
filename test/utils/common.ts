export type FlowNetwork = 'emulator' | 'testnet' | 'mainnet';
export type FlowCurrency = 'FLOW' | 'FUSD';

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
