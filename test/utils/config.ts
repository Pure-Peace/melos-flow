import flowConfig from '../../flow.json';

export const TESTNET_ADDRESS = 'https://access-testnet.onflow.org'
export const EMULATOR_PORT = 8080
export const EMULATOR_ADDRESS = `http://127.0.0.1:${EMULATOR_PORT}`

export const MINT_AMOUNT = 10000

export const CONTRACTS: Record<Contracts, string> = {
  NonFungibleToken: "NonFungibleToken",
}

type Contracts =
  "NonFungibleToken"

type TestAccount = {
  address: string
  privKey: string
  pubKey: string
}

/* export const FLOW_TESTNET_ACCOUNT_1: TestAccount = {
  address: "0x285b7909b8ed1652",
  privKey: "90a0c5a6cf05794f2e1104ca4be77895d8bfd8d4681eba3552ac5723f585b91c",
  pubKey: "12955691c2f82ebcda217af08f4619a96eb5991b95ac7c9c846e854f2164bc1048ed7f0ed5daa97ea37a638ea9d97b3e6981cd189d4a927a0244258e937d0fc4",
} */

export function getEmulatorPrivateKey() {
  return flowConfig.accounts['emulator-account'].key;
}