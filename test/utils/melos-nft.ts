import {sendTransaction, executeScript} from 'flow-cadut';
import {AuthAccount, scriptCode, txCode} from './helpers';

const limit = 999;

const addressMap = {
  NonFungibleToken: '0xf8d6e0586b0a20c7',
  MelosNFT: '0xf8d6e0586b0a20c7',
};

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
 * @param {string} account - account address
 * */
export async function balanceOf(address: string) {
  return executeScript<number>({code: scriptCode('melos-nft/getAccountBalance'), args: [address], addressMap, limit});
}
