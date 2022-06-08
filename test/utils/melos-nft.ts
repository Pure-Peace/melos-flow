import {sendTransaction, executeScript} from 'flow-cadut';
import {getAuthAccount, scriptCode, txCode} from './helpers';

const limit = 999;

const addressMap = {
  NonFungibleToken: '0xf8d6e0586b0a20c7',
  MelosNFT: '0xf8d6e0586b0a20c7',
};

export const setupCollection = async (account: string) => {
  const {auth} = await getAuthAccount(account);

  return sendTransaction({code: txCode('melos-nft/setupCollection'), payer: auth, addressMap, limit});
};

/**
 * Returns Melos supply.
 * @throws Will throw an error if execution will be halted
 * */
export const totalSupply = async () => {
  return executeScript({code: scriptCode('melos-nft/totalSupply'), addressMap, limit});
};

/**
 * Mints Melos to **recipient**.
 * */
export const mint = async (recipient: string) => {
  const {auth} = await getAuthAccount('emulator-account');

  return sendTransaction({code: txCode('melos-nft/mint'), args: [recipient], payer: auth, addressMap, limit});
};

/**
 * Transfers Melos NFT with id equal **itemId** from **sender** account to **recipient**.
 * @param {string} sender - sender address
 * @param {string} recipient - recipient address
 * @param {UInt64} itemId - id of the item to transfer
 * */
export const transfer = async (sender: string, recipient: string, itemId: number) => {
  const {auth} = await getAuthAccount(sender);

  return sendTransaction({
    code: txCode('melos-nft/transfer'),
    args: [itemId, recipient],
    payer: auth,
    addressMap,
    limit,
  });
};

export const getAccountNFTs = async (account: string) => {
  return executeScript({code: scriptCode('melos-nft/getAccountNFTs'), args: [account], addressMap, limit});
};

/**
 * Returns the number of Melos in an account's collection.
 * @param {string} account - account address
 * */
export const balanceOf = async (account: string) => {
  return executeScript({code: scriptCode('melos-nft/getAccountBalance'), args: [account], addressMap, limit});
};
