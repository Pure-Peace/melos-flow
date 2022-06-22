# MELOS-FLOW

The flow (cadence) contract of Melos NFT and Marketplace. Contains sdk, scripts and tests.

## Start

**Install**

```bash
npm i -g yarn
yarn
```

**Run test**

```bash
yarn test
```

**Run script**

- *This command can directly run the ts script in the /scripts directory, which is convenient for executing and debugging the cadence code.*
- *Please copy `.env.example` to `.env` and complete it before run this command*

```bash
yarn do <script name>
```

**Build js/ts sdk**

```bash
yarn build
```

**Publish package**

```bash
yarn buildPublish
```

**Generate esm/cjs/ts code used by sdk based on cadence script and transaction**

```bash
yarn prepare
```

**[Deploy / Update] project to flow [testnet / mainnet]**

1. Create `flow.json` corresponding to the network in the directory, such as: `flow.testnet.json` or `flow.mainnet.json`
2. Modify the `accounts` and `deployments` in the configuration file, configure the account for deployment and the contract that needs to be deployed

- *flow testnet*

```bash
yarn contract-deploy:testnet
yarn contract-update:testnet
```

- *flow mainnet*

```bash
yarn contract-deploy:mainnet
yarn contract-update:mainnet
```

**SDK Examples**

```typescript
import {
  MelosMarketplaceSDK,
  MelosNFTSDK,
  TESTNET_BASE_ADDRESS_MAP,
  flowTokenReplaceMap,
  melosNftReplaceMap,
} from "@melosstudio/flow-sdk";

const TESTNET_ADDRESS_MAP = {
  ...TESTNET_BASE_ADDRESS_MAP,
  MelosNFT: MELOS_NFT_ADDRESS,
  MelosMarketplace: MELOS_MARKETPLACE,
};

const TESTNET_REPLACE_MAP = {
  ...flowTokenReplaceMap("testnet"),
  ...melosNftReplaceMap(MELOS_NFT_ADDRESS),
};

const nftSDK = new MelosNFTSDK(TESTNET_ADDRESS_MAP, TESTNET_REPLACE_MAP);


// subscribe
const unsub =  (await nftSDK.removeCollection(fcl.authz)).unwrap().subscribe()

// only send
const { result, err } = await nftSDK.removeCollection(fcl.authz);

// full example
const tx = (await nftSDK.removeCollection(fcl.authz)).unwrap();

// wait for seal
await tx.seal()

// wait for final
await tx.final()

// wait for exec
await tx.exec()

// unwrap and wait for status
await (await nftSDK.removeCollection(fcl.authz)).assertOk("seal")
```
