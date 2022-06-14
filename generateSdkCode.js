#!/usr/bin/env node
'use strict';
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const BASE_PATH = path.join(__dirname, './cadence');
const SDK_CODE_PATH = path.join(__dirname, './sdk-code');

const INCLUDE_DIRS = ['scripts', 'transactions'];

const GENERATE_EXTS = ['.ts', '.cjs', '.mjs'];

let totalGenerated = 0;

if (!fs.existsSync(BASE_PATH)) {
  throw new Error(`${BASE_PATH} not exists`);
}

function fileHeader(ext) {
  return ['.ts', '.mjs'].includes(ext) ? 'export default' : 'module.exports =';
}

function add(dict, key, item) {
  if (!dict[key]) {
    dict[key] = [item];
  } else {
    dict[key].push(item);
  }
}

function createDirIfNotExists(path) {
  if (fs.existsSync(path)) return;
  fs.mkdirSync(path);
}

function generateFilesAtDir(files, group, dir) {
  let content = '';
  for (const file of files) {
    if (file.endsWith('.cdc')) {
      content +=
        '  ' +
        file.replace('.cdc', '') +
        ': `\n' +
        fs.readFileSync(path.join(BASE_PATH, dir, group === 'common' ? '' : group, file), {encoding: 'utf-8'}) +
        '\n`,\n';
    }
  }
  createDirIfNotExists(path.join(SDK_CODE_PATH, dir));
  for (const ext of GENERATE_EXTS) {
    const header = `${fileHeader(ext)} {\n`;
    fs.writeFileSync(path.join(SDK_CODE_PATH, dir, group + ext), header + content + '};\n', {encoding: 'utf-8'});
    totalGenerated++;
  }
}

createDirIfNotExists(SDK_CODE_PATH);
const dirs = fs.readdirSync(BASE_PATH);
for (const dir of dirs) {
  if (!INCLUDE_DIRS.includes(dir)) continue;
  const contents = fs.readdirSync(path.join(BASE_PATH, dir));
  const dict = {};
  for (const item of contents) {
    if (item.endsWith('.cdc')) {
      add(dict, 'common', item);
    } else {
      const childs = fs.readdirSync(path.join(BASE_PATH, dir, item));
      for (const child of childs) {
        add(dict, item, child);
      }
    }
  }
  for (const group in dict) {
    generateFilesAtDir(dict[group], group, dir);
  }
}

console.log('generateSdkCode: ', totalGenerated, 'files are generated');
