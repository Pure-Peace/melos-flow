import {sendTransaction, executeScript} from 'flow-cadut';
import {txCode, scriptCode} from '../common';
import {AuthAccount} from '../types';
import {addressMap, limit} from './config';

export async function setupCollection(account: AuthAccount) {
  return sendTransaction({code: txCode('melos-nft/setupCollection'), payer: account.auth, addressMap, limit});
}

/**
 * Returns Melos supply.
 * @throws Will throw an error if execution will be halted
 * */
export async function totalSupply() {
  return executeScript<number>({code: scriptCode('melos-nft/totalSupply'), addressMap, limit});
}

/**
 * Mints Melos to **recipient**.
 * */
export async function mint(minter: AuthAccount, recipient: string) {
  return sendTransaction({code: txCode('melos-nft/mint'), args: [recipient], payer: minter.auth, addressMap, limit});
}

/**
 * Transfers Melos NFT with id equal **itemId** from **sender** account to **recipient**.
 * @param {AuthAccount} sender - sender
 * @param {string} recipient - recipient address
 * @param {UInt64} itemId - id of the item to transfer
 * */
export async function transfer(sender: AuthAccount, recipient: string, itemId: number) {
  return sendTransaction({
    code: txCode('melos-nft/transfer'),
    args: [itemId, recipient],
    payer: sender.auth,
    addressMap,
    limit,
  });
}

export async function getAccountNFTs(address: string) {
  return executeScript<number[]>({code: scriptCode('melos-nft/getAccountNFTs'), args: [address], addressMap, limit});
}

/**
 * Returns the number of Melos in an account's collection.
 * @param {string} address - account address
 * */
export async function balanceOf(address: string) {
  return executeScript<number>({code: scriptCode('melos-nft/getAccountBalance'), args: [address], addressMap, limit});
}

export async function getAccountHasNFT(address: string, nftId: number) {
  return executeScript<boolean>({
    code: scriptCode('melos-nft/getAccountHasNFT'),
    args: [address, nftId],
    addressMap,
    limit,
  });
}
