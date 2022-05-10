import { mintFlow, getAccountAddress, executeScript, sendTransaction, deployContractByName } from 'flow-js-testing';

export const melosAdminAddress = async () => {
  return await getAccountAddress('MelosAdmin');
};

/**
 * Deploys NonFungibleToken and Melos contracts to MelosAdmin.
 * @throws Will throw an error if transaction is reverted.
 * @returns {Promise<[{*} txResult, {error} error]>}
 * */
export const deployMelos = async (): Promise<any> => {
  const melosAdmin = await melosAdminAddress();
  await mintFlow(melosAdmin, '10.0');

  await deployContractByName({ to: melosAdmin, name: 'NonFungibleToken' });
  return deployContractByName({ to: melosAdmin, name: 'MelosNFT' });
};

/**
 * Setups Melos collection on account and exposes public capability.
 * @param {string} account - account address
 * @returns {Promise<[{*} txResult, {error} error]>}
 * */
export const setupMelosOnAccount = async (account: string): Promise<any> => {
  const name = 'melos-nft/setup_account';
  const signers = [account];

  return sendTransaction({ name, signers });
};

/**
 * Returns Melos supply.
 * @throws Will throw an error if execution will be halted
 * @returns {UInt64} - number of NFT minted so far
 * */
export const getMelosSupply = async (): Promise<number> => {
  const name = 'melos-nft/get_melos_supply';

  return executeScript({ name });
};

/**
 * Mints Melos to **recipient**.
 * @returns {Promise<[{*} result, {error} error]>}
 * */
export const mintMelos = async (recipient: string): Promise<any> => {
  const admin = await melosAdminAddress();

  const name = 'melos-nft/mint_melos_nft';
  const args = [recipient];
  const signers = [admin];

  return sendTransaction({ name, args, signers });
};

/**
 * Transfers Melos NFT with id equal **itemId** from **sender** account to **recipient**.
 * @param {string} sender - sender address
 * @param {string} recipient - recipient address
 * @param {UInt64} itemId - id of the item to transfer
 * @throws Will throw an error if execution will be halted
 * @returns {Promise<*>}
 * */
export const transferMelos = async (sender: string, recipient: string, itemId: number): Promise<any> => {
  const name = 'melos-nft/transfer_melos';
  const args = [recipient, itemId];
  const signers = [sender];

  return sendTransaction({ name, args, signers });
};

/**
 * Returns the Melos NFT with the provided **id** from an account collection.
 * @param {string} account - account address
 * @param {UInt64} itemID - NFT id
 * @throws Will throw an error if execution will be halted
 * @returns {UInt64}
 * */
export const getMelos = async (account: string, itemID: number): Promise<number> => {
  const name = 'melos-nft/get_melos';
  const args = [account, itemID];

  return executeScript({ name, args });
};

/**
 * Returns the number of Melos in an account's collection.
 * @param {string} account - account address
 * @throws Will throw an error if execution will be halted
 * @returns {UInt64}
 * */
export const getMelosCount = async (account: string): Promise<number> => {
  const name = 'melos-nft/get_collection_length';
  const args = [account];

  return executeScript({ name, args });
};
