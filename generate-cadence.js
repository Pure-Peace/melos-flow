#!/usr/bin/env node
'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const BASE_PATH = path.join(__dirname, './cadence');
const INCLUDE_DIRS = ['contracts', 'scripts', 'transactions'];
const TEMPLATE_ENDS = '-templates';

const REPLACE_MAP = {
  NFT_NAME: 'MelosNFT',
  NFT_ADDRESS: '"../../contracts/MelosNFT.cdc"',
  NFT_PROVIDER_PRIVATE_PATH: '/private/MelosNFTCollectionProviderPrivatePath',
  NFT_PUBLIC_PATH: 'MelosNFT.CollectionPublicPath',
  NFT_STORAGE_PATH: 'MelosNFT.CollectionStoragePath',
  FT_NAME: 'FlowToken',
  FT_RECEIVER: '/public/flowTokenReceiver',
  FT_ADDRESS: '"../../contracts/core/FlowToken.cdc"',
  FT_STORAGE_PATH: '/storage/flowTokenVault',
};

let totalGenerated = 0;

if (!fs.existsSync(BASE_PATH)) {
  throw new Error(`${BASE_PATH} not exists`);
}

function cdcReplace(input) {
  for (const [k, v] of Object.entries(REPLACE_MAP)) {
    input = input.replace(new RegExp(`%${k}%`, 'g'), v);
  }
  return input;
}

const dirs = fs.readdirSync(BASE_PATH);
for (const dir of dirs) {
  if (!INCLUDE_DIRS.includes(dir)) continue;
  const templateDirs = fs
    .readdirSync(path.join(BASE_PATH, dir))
    .filter((val) => val.endsWith(TEMPLATE_ENDS))
    .map((val) => path.join(BASE_PATH, dir, val));
  for (const templateDir of templateDirs) {
    const cdcFiles = fs.readdirSync(templateDir).filter((val) => val.endsWith('.cdc'));
    const generateDir = templateDir.replace(TEMPLATE_ENDS, '');
    if (!fs.existsSync(generateDir)) {
      fs.mkdirSync(generateDir);
    }
    for (const cdcFile of cdcFiles) {
      const cdcContent = fs.readFileSync(path.join(templateDir, cdcFile), {encoding: 'utf-8'});
      const output = cdcReplace(cdcContent);
      fs.writeFileSync(path.join(generateDir, cdcFile), output, {encoding: 'utf-8'});
      totalGenerated++;
    }
  }
}
console.log('generateCadence: ', totalGenerated, 'files are generated');
