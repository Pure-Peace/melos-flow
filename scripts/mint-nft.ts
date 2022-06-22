/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as fcl from '@onflow/fcl';

import {MelosNFTSDK} from '../src/contracts-sdk/melos-nft';
import {TESTNET_BASE_ADDRESS_MAP, flowTokenReplaceMap, melosNftReplaceMap, getMaps} from '../src/common';
import {createAuth, getAccountFromEnv} from '../src/flow-service';
import {MelosMarketplaceAdminSDK, MelosMarketplaceSDK} from '../src/contracts-sdk/melos-marketplace';
import {CommonSDK} from '../src/contracts-sdk/common';

const NETWORK = (process.env.NETWORK as any) || 'emulator';
const {addressMap, replaceMap} = getMaps(NETWORK);

class InitMarketplace {
  async main() {
    const commonSDK = new CommonSDK(addressMap, replaceMap);
    const nftSDK = new MelosNFTSDK(addressMap, replaceMap);
    const marketplaceSDK = new MelosMarketplaceSDK(addressMap, replaceMap);
    const adminSDK = new MelosMarketplaceAdminSDK(addressMap, replaceMap);

    const {address, pk, keyId} = getAccountFromEnv(NETWORK);
    const auth = createAuth(fcl, NETWORK, address!, pk!, keyId);

    const result = await (await nftSDK.mint(auth, address, 10)).assertOk('seal');

    // Mint test
    /* for (let i = 0; i < 20; i++) {
      const result = await (await nftSDK.mint(auth, address, 5).assertOk('seal));
      console.log(`mint #${i + 1}: `, result);
    } */

    return result;
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
