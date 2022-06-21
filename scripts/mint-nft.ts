/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as fcl from '@onflow/fcl';

import {MelosNFTSDK} from '../sdk/contracts-sdk/melos-nft';
import {
  ScriptRunner,
  ReplaceMap,
  TESTNET_BASE_ADDRESS_MAP,
  flowTokenReplaceMap,
  melosNftReplaceMap,
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

    const result = await nftSDK.mint(auth, address, 10);

    // Mint test
    /* for (let i = 0; i < 20; i++) {
      const result = await nftSDK.mint(auth, address, 5);
      console.log(`mint #${i + 1}: `, result);
    } */

    return result;
  }
}

new InitMarketplace().run();
