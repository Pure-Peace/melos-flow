/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as fcl from '@onflow/fcl';

import {MelosNFTSDK} from '../src/contracts-sdk/melos-nft';
import {
  ScriptRunner,
  TESTNET_BASE_ADDRESS_MAP,
  flowTokenReplaceMap,
  melosNftReplaceMap,
  toUFix64,
  getMaps,
} from '../src/common';
import {createAuth, getAccountFromEnv} from '../src/flow-service';
import {MelosMarketplaceAdminSDK, MelosMarketplaceSDK} from '../src/contracts-sdk/melos-marketplace';
import {CommonSDK} from '../src/contracts-sdk/common';

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

    const r1 = await (
      await adminSDK.setAllowedPaymentTokens(auth, [
        {tokenName: 'FlowToken', tokenAddress: TESTNET_BASE_ADDRESS_MAP.FlowToken},
        {tokenName: 'FUSD', tokenAddress: TESTNET_BASE_ADDRESS_MAP.FUSD},
      ])
    ).assertOk('seal');

    const txFeeReceiver = address;
    const txFeePercent = toUFix64(0.2)!;
    const royaltyReceiver = address;
    const r2 = await (
      await adminSDK.setTokenFeeConfig(
        auth,
        'FlowToken',
        TESTNET_BASE_ADDRESS_MAP.FlowToken,
        txFeeReceiver,
        txFeePercent,
        royaltyReceiver
      )
    ).assertOk('seal');
    return [r1, r2];
  }
}

new InitMarketplace().run();
