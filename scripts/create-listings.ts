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
  ListingType,
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

    const r = await (await marketplaceSDK.createListing(auth, 1, ListingType.Common, {price: 5})).assertOk('seal');
    const r1 = await (await marketplaceSDK.createListing(auth, 2, ListingType.Common, {price: 5})).assertOk('seal');
    const r2 = await (
      await marketplaceSDK.createListing(auth, 3, ListingType.EnglishAuction, {
        reservePrice: 4,
        minimumBidPercentage: 0.2,
        basePrice: 1,
        listingDuration: 3600,
      })
    ).assertOk('seal');
    const r3 = await (
      await marketplaceSDK.createListing(auth, 4, ListingType.EnglishAuction, {
        reservePrice: 4,
        minimumBidPercentage: 0.2,
        basePrice: 1,
        listingDuration: 3600,
      })
    ).assertOk('seal');
    return [r, r1, r2, r3];
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
