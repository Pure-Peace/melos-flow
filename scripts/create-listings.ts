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
import {ListingType} from '../sdk/type-contracts/MelosMarketplace';

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

    const r = await marketplaceSDK.createListing(auth, 1, ListingType.Common, {price: 5});
    const r1 = await marketplaceSDK.createListing(auth, 2, ListingType.Common, {price: 5});
    const r2 = await marketplaceSDK.createListing(auth, 3, ListingType.EnglishAuction, {
      reservePrice: 4,
      minimumBidPercentage: 0.2,
      basePrice: 1,
      listingDuration: 3600,
    });
    const r3 = await marketplaceSDK.createListing(auth, 4, ListingType.EnglishAuction, {
      reservePrice: 4,
      minimumBidPercentage: 0.2,
      basePrice: 1,
      listingDuration: 3600,
    });
    return [r, r1, r2, r3];
  }
}

new InitMarketplace().run();
