import {sendTransaction, executeScript} from 'flow-cadut';
import {getAuthAccount, scriptCode, txCode} from './helpers';

const limit = 999;

const addressMap = {
  NonFungibleToken: '0xf8d6e0586b0a20c7',
  MelosNFT: '0xf8d6e0586b0a20c7',
};

/**
 * Setups Melos collection on account and exposes public capability.
 * @param {string} account - account address
 * */
export const setupMelosOnAccount = async (account: string) => {
  const {auth} = await getAuthAccount(account);

  return sendTransaction({code: txCode('melos-nft/setup_account'), payer: auth, addressMap, limit});
};

/**
 * Returns Melos supply.
 * @throws Will throw an error if execution will be halted
 * */
export const getMelosSupply = async () => {
  return executeScript({code: scriptCode('melos-nft/get_melos_supply'), addressMap, limit});
};

/**
 * Mints Melos to **recipient**.
 * */
export const mintMelos = async (recipient: string) => {
  const {auth} = await getAuthAccount('emulator-account');

  return sendTransaction({code: txCode('melos-nft/mint_melos_nft'), args: [recipient], payer: auth, addressMap, limit});
};

/**
 * Transfers Melos NFT with id equal **itemId** from **sender** account to **recipient**.
 * @param {string} sender - sender address
 * @param {string} recipient - recipient address
 * @param {UInt64} itemId - id of the item to transfer
 * */
export const transferMelos = async (sender: string, recipient: string, itemId: number) => {
  const {auth} = await getAuthAccount(sender);

  return sendTransaction({
    code: txCode('melos-nft/transfer_melos_nft'),
    args: [recipient, itemId],
    payer: auth,
    addressMap,
    limit,
  });
};

/**
 * Returns the Melos NFT with the provided **id** from an account collection.
 * @param {string} account - account address
 * @param {UInt64} itemID - NFT id
 * */
export const getMelos = async (account: string, itemID: number) => {
  return executeScript({code: scriptCode('melos-nft/get_melos'), args: [account, itemID], addressMap, limit});
};

/**
 * Returns the number of Melos in an account's collection.
 * @param {string} account - account address
 * */
export const getMelosCount = async (account: string) => {
  return executeScript({code: scriptCode('melos-nft/get_collection_length'), args: [account], addressMap, limit});
};
