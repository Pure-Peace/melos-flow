import {sendTransaction, executeScript} from 'flow-cadut';
import {getAuthAccount, scriptCode, txCode} from './helpers';

const limit = 999;

const addressMap = {
  NonFungibleToken: '0xf8d6e0586b0a20c7',
  MelosNFT: '0xf8d6e0586b0a20c7',
  NFTStorefront: '0xf8d6e0586b0a20c7',
};

/**
 * Sets up NFTStorefront.Storefront on account and exposes public capability.
 * @param {string} account - account address
 * @throws Will throw an error if transaction is reverted.
 * */
export const setupStorefrontOnAccount = async (account: string) => {
  const {auth} = await getAuthAccount(account);

  return sendTransaction({code: txCode('nft-storefront/setup_account'), payer: auth, addressMap, limit});
};

/**
 * Lists item with id equal to **item** id for sale with specified **price**.
 * @param {string} seller - seller account address
 * @param {UInt64} itemId - id of item to sell
 * @param {UFix64} price - price
 * */
export const createListing = async (seller: string, itemId: number, price: string) => {
  const {auth} = await getAuthAccount(seller);

  return sendTransaction({
    code: txCode('nft-storefront/create_listing'),
    args: [itemId, price],
    payer: auth,
    addressMap,
    limit,
  });
};

/**
 * Buys item with id equal to **item** id for **price** from **seller**.
 * @param {string} buyer - buyer account address
 * @param {UInt64} resourceId - resource uuid of item to sell
 * @param {string} seller - seller account address
 * */
export const purchaseListing = async (buyer: string, resourceId: number, seller: string) => {
  const {auth} = await getAuthAccount(buyer);

  return sendTransaction({
    code: txCode('nft-storefront/purchase_listing'),
    args: [resourceId, seller],
    payer: auth,
    addressMap,
    limit,
  });
};

/**
 * Removes item with id equal to **item** from sale.
 * @param {string} owner - owner address
 * @param {UInt64} itemId - id of item to remove
 * */
export const removeListing = async (owner: string, itemId: number) => {
  const {auth} = await getAuthAccount(owner);

  return sendTransaction({
    code: txCode('nft-storefront/remove_listing'),
    args: [itemId],
    payer: auth,
    addressMap,
    limit,
  });
};

/**
 * Returns the number of items for sale in a given account's storefront.
 * @param {string} account - account address
 * */
export const getListingCount = async (account: string) => {
  return executeScript({code: scriptCode('nft-storefront/get_listings_length'), args: [account], addressMap, limit});
};
