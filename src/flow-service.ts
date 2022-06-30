/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {ec as EC} from 'elliptic';
import {SHA3} from 'sha3';

import {toFlowAddress} from './common';
import {accounts} from './config';
import {FlowAuthorize, FlowEnv, FlowNetwork} from './types';
import {Buffer as __Buffer} from 'buffer/';

const ec = new EC('p256');

const _Buffer = Buffer || __Buffer;

export class FlowService {
  constructor(
    private readonly fcl: any,
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
    const key = ec.keyFromPrivate(_Buffer.from(privateKey, 'hex'));
    const sig = key.sign(this.hashMsg(msg));
    const n = 32;
    const r = sig.r.toArrayLike(_Buffer, 'be', n);
    const s = sig.s.toArrayLike(_Buffer, 'be', n);
    return _Buffer.concat([r, s]).toString('hex');
  };

  private hashMsg = (msg: string) => {
    const sha = new SHA3(256);
    sha.update(_Buffer.from(msg, 'hex'));
    return sha.digest();
  };
}

export function getAccessNode(network: FlowNetwork, env?: FlowEnv) {
  switch (network) {
    case 'emulator': {
      return env?.EMULATOR_ACCESS_NODE || 'http://127.0.0.1:8080';
    }
    case 'testnet': {
      return env?.TESTNET_ACCESS_NODE || 'https://access-testnet.onflow.org';
    }
    case 'mainnet': {
      return env?.MAINNET_ACCESS_NODE || 'https://access.onflow.org';
    }
  }
}

export function getAccountFromEnv(network: FlowNetwork, env: FlowEnv, name?: string) {
  if (network === 'emulator') {
    const {address, key} = accounts[name || 'emulator-account'];
    return {
      address,
      pk: key,
      keyId: 0,
    };
  }

  const ADDR_ENV_KEY = `${name ? name.toLocaleUpperCase() + '_' : ''}${network.toUpperCase()}_FLOW_ACCOUNT_ADDRESS`;
  const PRIVKEY_ENV_KEY = `${
    name ? name.toLocaleUpperCase() + '_' : ''
  }${network.toUpperCase()}_FLOW_ACCOUNT_PRIVATE_KEY`;
  const KEY_ID_ENV_KEY = `${name ? name.toLocaleUpperCase() + '_' : ''}${network.toUpperCase()}_FLOW_ACCOUNT_KEY_ID`;

  const account = {
    address: env[ADDR_ENV_KEY]!,
    pk: env[PRIVKEY_ENV_KEY]!,
    keyId: env[KEY_ID_ENV_KEY]!,
  };
  if (!account.address) throw new Error(`Cannot get address from env key "${ADDR_ENV_KEY}"`);
  if (!account.pk) throw new Error(`Cannot get privateKey from env "${PRIVKEY_ENV_KEY}"`);
  if (!account.keyId) throw new Error(`Cannot get keyId from env "${KEY_ID_ENV_KEY}"`);
  return account;
}

export function setAccessNode(fcl: any, network: FlowNetwork, env?: FlowEnv) {
  fcl.config().put('accessNode.api', getAccessNode(network, env));
}

export function createAuth(fcl: any, accountAddress: string, privateKey: string, keyIndex: number | string = 0) {
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

  static parseStr(str: string) {
    const [address, pk, keyId] = str.split(':');
    return new FlowAccount(address, pk, Number(keyId || 0));
  }

  static parseObj(obj: {address: string; pk: string; keyId: number}) {
    return new FlowAccount(obj.address, obj.pk, Number(obj.keyId || 0));
  }

  upgrade(fcl: any): AuthFlowAccount {
    return AuthFlowAccount.fromFlowAccount(fcl, this);
  }

  createAuth(fcl: any) {
    return createAuth(fcl, this.address, this.pk, this.keyId);
  }
}

export class AuthFlowAccount extends FlowAccount {
  auth: FlowAuthorize;
  constructor(fcl: any, address: string, pk: string, keyId = 0) {
    super(address, pk, keyId);
    this.auth = this.createAuth(fcl);
  }

  static fromFlowAccount(fcl: any, flowAccount: FlowAccount) {
    return new AuthFlowAccount(fcl, flowAccount.address, flowAccount.pk, flowAccount.keyId);
  }
}
