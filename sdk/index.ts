import * as common from './contracts-sdk/common';
import * as nft from './contracts-sdk/melos-nft';
import * as marketplace from './contracts-sdk/melos-marketplace';

import * as MelosMarketplace from './type-contracts/MelosMarketplace';
import * as MelosNFT from './type-contracts/MelosNFT';
import * as cores from './type-contracts/cores';

export * as base from './common';
export * as flowService from './flow-service';

export const sdk = {common, nft, marketplace};
export const types = {MelosMarketplace, MelosNFT, cores};
