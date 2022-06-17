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

const MELOS_NFT_ADDRESS = '0xe2fb1d6d24d0919e';
const MELOS_MARKETPLACE = '0xe2fb1d6d24d0919e';

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

    const result = await nftSDK.batchMint(auth, 20, '0x0bdba890ea791601');
    return result;
  }
}

new InitMarketplace().run();
