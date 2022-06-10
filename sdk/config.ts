import path from 'path';

export const TESTNET_ADDRESS = 'https://access-testnet.onflow.org';
export const EMULATOR_PORT = 8080;
export const EMULATOR_ADDRESS = `http://127.0.0.1:${EMULATOR_PORT}`;
export const BASE_PATH = path.join(__dirname, '../cadence');

export const MINT_AMOUNT = 10000;

export type FlowNetwork = 'emulator' | 'testnet' | 'mainnet';
