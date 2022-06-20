/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as fcl from '@onflow/fcl';

import {MelosNFTSDK} from '../sdk/contracts-sdk/melos-nft';
import {
  ScriptRunner,
  ReplaceMap,
  TESTNET_BASE_ADDRESS_MAP,
  flowTokenReplaceMap,
  melosNftReplaceMap,
} from '../sdk/common';
import {createAuth, getAccountFromEnv} from '../sdk/flow-service';
import {MelosMarketplaceAdminSDK, MelosMarketplaceSDK} from '../sdk/contracts-sdk/melos-marketplace';
import {CommonSDK} from '../sdk/contracts-sdk/common';

const MELOS_NFT_ADDRESS = process.env.TESTNET_MELOS_NFT_ADDRESS!;
const MELOS_MARKETPLACE = process.env.TESTNET_MELOS_MARKETPLACE!;

const TESTNET_ADDRESS_MAP = {
  ...TESTNET_BASE_ADDRESS_MAP,
  MelosNFT: MELOS_NFT_ADDRESS,
  MelosMarketplace: MELOS_MARKETPLACE,
};

const TESTNET_REPLACE_MAP: ReplaceMap = {
  ...flowTokenReplaceMap('testnet'),
  ...melosNftReplaceMap(MELOS_NFT_ADDRESS),
};

class InitMarketplace extends ScriptRunner {
  async main() {
    const commonSDK = new CommonSDK(TESTNET_ADDRESS_MAP, TESTNET_REPLACE_MAP);
    const nftSDK = new MelosNFTSDK(TESTNET_ADDRESS_MAP, TESTNET_REPLACE_MAP);
    const marketplaceSDK = new MelosMarketplaceSDK(TESTNET_ADDRESS_MAP, TESTNET_REPLACE_MAP);
    const adminSDK = new MelosMarketplaceAdminSDK(TESTNET_ADDRESS_MAP, TESTNET_REPLACE_MAP);

    const {address, pk, keyId} = getAccountFromEnv('testnet');
    const auth = createAuth(fcl, 'testnet', address!, pk!, keyId);

    const result = await nftSDK.mint(auth, address, 10);

    // Mint test
    /* for (let i = 0; i < 20; i++) {
      const result = await nftSDK.mint(auth, address, 5);
      console.log(`mint #${i + 1}: `, result);
    } */
  }
}

new InitMarketplace().run();
