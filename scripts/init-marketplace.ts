/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as fcl from '@onflow/fcl';

import {MelosNFTSDK} from '../sdk/contracts-sdk/melos-nft';
import {
  ScriptRunner,
  ReplaceMap,
  TESTNET_BASE_ADDRESS_MAP,
  flowTokenReplaceMap,
  melosNftReplaceMap,
  toUFix64,
  getMaps,
} from '../sdk/common';
import {createAuth, getAccountFromEnv} from '../sdk/flow-service';
import {MelosMarketplaceAdminSDK, MelosMarketplaceSDK} from '../sdk/contracts-sdk/melos-marketplace';
import {CommonSDK} from '../sdk/contracts-sdk/common';

const NETWORK = (process.env.NETWORK as any) || 'emulator';
const {addressMap, replaceMap} = getMaps(NETWORK);
class InitMarketplace extends ScriptRunner {
  async main() {
    const commonSDK = new CommonSDK(addressMap, replaceMap);
    const nftSDK = new MelosNFTSDK(addressMap, replaceMap);
    const marketplaceSDK = new MelosMarketplaceSDK(addressMap, replaceMap);
    const adminSDK = new MelosMarketplaceAdminSDK(addressMap, replaceMap);

    const {address, pk, keyId} = getAccountFromEnv(NETWORK);
    const auth = createAuth(fcl, NETWORK, address!, pk!, keyId);

    const r1 = await adminSDK.setAllowedPaymentTokens(auth, [
      {tokenName: 'FlowToken', tokenAddress: TESTNET_BASE_ADDRESS_MAP.FlowToken},
      {tokenName: 'FUSD', tokenAddress: TESTNET_BASE_ADDRESS_MAP.FUSD},
    ]);

    const txFeeReceiver = address;
    const txFeePercent = toUFix64(0.2)!;
    const royaltyReceiver = address;
    const r2 = await adminSDK.setTokenFeeConfig(
      auth,
      'FlowToken',
      TESTNET_BASE_ADDRESS_MAP.FlowToken,
      txFeeReceiver,
      txFeePercent,
      royaltyReceiver
    );
    return [r1, r2];
  }
}

new InitMarketplace().run();
