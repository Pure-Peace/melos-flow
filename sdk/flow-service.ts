/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {ec as EC} from 'elliptic';
import {SHA3} from 'sha3';
import type {Fcl} from '@rarible/fcl-types';

import {toFlowAddress} from './common';
import {FlowNetwork} from './config';

const ec = new EC('p256');

export const accounts = {
  'emulator-account': {
    address: '0xf8d6e0586b0a20c7',
    key: '98e4e163c9494dbfc2dc271f48941ed7113890d5fddc2cfa8a603836a09806b8',
  },
};

export type FlowSigningFunctionResponse = {addr: string; keyId: number; signature: string};
export type FlowSigningFunction = (signable: {message: string}) => FlowSigningFunctionResponse;
export type FlowAuthorizeResponce = {
  tempId: string;
  addr: string;
  keyId: number;
  signingFunction: FlowSigningFunction;
};
export type FlowAuthorize = (account: any) => Promise<FlowAuthorizeResponce>;

export class FlowService {
  constructor(
    private readonly fcl: Fcl,
    private readonly flowAddress: string,
    private readonly privateKeyHex: string,
    private readonly accountIndex: string | number
  ) {}

  authorizeMinter = (): FlowAuthorize => {
    return async (account = {}) => {
      const latestUser = async () => {
        const user = await this.getAccount(this.flowAddress);
        return {
          user,
          keyIndex: user.keys[+this.accountIndex].index,
        };
      };
      const {user, keyIndex} = await latestUser();

      const sign = this.signWithKey;
      const pk = this.privateKeyHex;

      return {
        ...account,
        tempId: `${user.address}-${keyIndex}`,
        addr: this.fcl.sansPrefix(user.address),
        keyId: +keyIndex,
        signingFunction: async (signable) => {
          return {
            addr: this.fcl.withPrefix(user.address),
            keyId: (await latestUser()).keyIndex,
            signature: sign(pk, signable.message),
          };
        },
      };
    };
  };

  getAccount = async (
    addr: string
  ): Promise<{
    keys: {
      index: number;
    }[];
    address: string;
  }> => {
    const {account} = await this.fcl.send([this.fcl.getAccount(addr)]);
    return account;
  };

  private signWithKey = (privateKey: string, msg: string): string => {
    const key = ec.keyFromPrivate(Buffer.from(privateKey, 'hex'));
    const sig = key.sign(this.hashMsg(msg));
    const n = 32;
    const r = sig.r.toArrayLike(Buffer, 'be', n);
    const s = sig.s.toArrayLike(Buffer, 'be', n);
    return Buffer.concat([r, s]).toString('hex');
  };

  private hashMsg = (msg: string) => {
    const sha = new SHA3(256);
    sha.update(Buffer.from(msg, 'hex'));
    return sha.digest();
  };
}

export function getAccessNode(network: FlowNetwork) {
  switch (network) {
    case 'emulator': {
      return process.env.EMULATOR_ACCESS_NODE || 'http://127.0.0.1:8080';
    }
    case 'testnet': {
      return process.env.TESTNET_ACCESS_NODE || 'https://access-testnet.onflow.org';
    }
    case 'mainnet': {
      return process.env.MAINNET_ACCESS_NODE || 'https://access.onflow.org';
    }
  }
}

export function getAccountFromEnv(network: FlowNetwork, name?: string) {
  if (network === 'emulator') {
    const {address, key} = accounts[name || 'emulator-account'];
    return {
      address,
      pk: key,
      keyId: 0,
    };
  }

  const ADDR_ENV_KEY = `${name ? name.toLocaleUpperCase() : ''}_${network.toUpperCase()}_FLOW_ACCOUNT_ADDRESS`;
  const PRIVKEY_ENV_KEY = `${name ? name.toLocaleUpperCase() : ''}_${network.toUpperCase()}_FLOW_ACCOUNT_PRIVATE_KEY`;
  const KEY_ID_ENV_KEY = `${name ? name.toLocaleUpperCase() : ''}_${network.toUpperCase()}_FLOW_ACCOUNT_KEY_ID`;

  const account = {
    address: process.env[ADDR_ENV_KEY]!,
    pk: process.env[PRIVKEY_ENV_KEY]!,
    keyId: process.env[KEY_ID_ENV_KEY]!,
  };
  if (!account.address) throw new Error(`Cannot get address from env key "${ADDR_ENV_KEY}"`);
  if (!account.pk) throw new Error(`Cannot get privateKey from env "${PRIVKEY_ENV_KEY}"`);
  if (!account.keyId) throw new Error(`Cannot get keyId from env "${KEY_ID_ENV_KEY}"`);
  return account;
}

export function setAccessNode(fcl: Fcl, network: FlowNetwork) {
  fcl.config().put('accessNode.api', getAccessNode(network));
}

export function createAuth(
  fcl: Fcl,
  network: FlowNetwork,
  accountAddress: string,
  privateKey: string,
  keyIndex: number | string = 0
) {
  setAccessNode(fcl, network);
  const flowService = new FlowService(fcl, toFlowAddress(accountAddress), privateKey, Number(keyIndex));
  return flowService.authorizeMinter();
}

export class FlowAccount {
  address: string;
  pk: string;
  keyId: number;
  constructor(address: string, pk: string, keyId = 0) {
    this.address = address;
    this.pk = pk;
    this.keyId = keyId;
  }

  static parse(str: string) {
    const [address, pk, keyId] = str.split(':');
    return new FlowAccount(address, pk, Number(keyId || 0));
  }

  upgrade(fcl: any, network: FlowNetwork): AuthFlowAccount {
    return AuthFlowAccount.fromFlowAccount(fcl, network, this);
  }

  createAuth(fcl: any, network: FlowNetwork) {
    return createAuth(fcl, network, this.address, this.pk, this.keyId);
  }
}

export class AuthFlowAccount extends FlowAccount {
  auth: FlowAuthorize;
  constructor(fcl: any, network: FlowNetwork, address: string, pk: string, keyId = 0) {
    super(address, pk, keyId);
    this.auth = this.createAuth(fcl, network);
  }

  static fromFlowAccount(fcl: any, network: FlowNetwork, flowAccount: FlowAccount) {
    return new AuthFlowAccount(fcl, network, flowAccount.address, flowAccount.pk, flowAccount.keyId);
  }
}
