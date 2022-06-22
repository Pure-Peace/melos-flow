import path from 'path';

export const TESTNET_ADDRESS = 'https://access-testnet.onflow.org';
export const EMULATOR_PORT = 8080;
export const EMULATOR_ADDRESS = `http://127.0.0.1:${EMULATOR_PORT}`;
export const BASE_PATH = path.join(__dirname, '../cadence');

export const MINT_AMOUNT = 10000;

export const accounts = {
  'emulator-account': {
    address: '0xf8d6e0586b0a20c7',
    key: '98e4e163c9494dbfc2dc271f48941ed7113890d5fddc2cfa8a603836a09806b8',
  },
};
