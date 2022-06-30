/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as fcl from '@onflow/fcl';
import {
  getMaps,
  CommonSDK,
  MelosNFTSDK,
  MelosMarketplaceSDK,
  MelosMarketplaceAdminSDK,
  getAccountFromEnv,
  createAuth,
  TESTNET_BASE_ADDRESS_MAP,
  toUFix64,
  setAccessNode,
} from '../src';

const NETWORK = (process.env.NETWORK as any) || 'emulator';
const {addressMap, replaceMap} = getMaps(NETWORK, {env: process.env});
class InitMarketplace {
  async main() {
    const commonSDK = new CommonSDK(addressMap, replaceMap);
    const nftSDK = new MelosNFTSDK(addressMap, replaceMap);
    const marketplaceSDK = new MelosMarketplaceSDK(addressMap, replaceMap);
    const adminSDK = new MelosMarketplaceAdminSDK(addressMap, replaceMap);

    const {address, pk, keyId} = getAccountFromEnv(NETWORK, process.env);
    setAccessNode(fcl, NETWORK, process.env);
    const auth = createAuth(fcl, address!, pk!, keyId);

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

new InitMarketplace()
  .main()
  .then((r) => {
    console.log('End with: ', r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
  });
