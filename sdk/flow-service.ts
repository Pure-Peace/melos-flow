import {ec as EC} from 'elliptic';
import {SHA3} from 'sha3';
import type {Fcl} from '@rarible/fcl-types';

const ec = new EC('p256');

export type FlowSigningFunctionResponse = {addr: string; keyId: number; signature: string};
export type FlowSigningFunction = (signable: {message: string}) => FlowSigningFunctionResponse;
export type FlowAuthorizeMinterResponce = {
  tempId: string;
  addr: string;
  keyId: number;
  signingFunction: FlowSigningFunction;
};
export type FlowAuthorizeMinter = (account: any) => Promise<FlowAuthorizeMinterResponce>;

class FlowService {
  constructor(
    private readonly fcl: Fcl,
    private readonly minterFlowAddress: string,
    private readonly minterPrivateKeyHex: string,
    private readonly minterAccountIndex: string | number
  ) {}

  authorizeMinter = (): FlowAuthorizeMinter => {
    return async (account = {}) => {
      const latestUser = async () => {
        const user = await this.getAccount(this.minterFlowAddress);
        return {
          user,
          keyIndex: user.keys[+this.minterAccountIndex].index,
        };
      };
      const {user, keyIndex} = await latestUser();

      const sign = this.signWithKey;
      const pk = this.minterPrivateKeyHex;

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

export {FlowService};
