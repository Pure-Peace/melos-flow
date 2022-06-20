# MELOS-FLOW

The flow (cadence) contract of Melos NFT and Marketplace. Contains sdk, scripts and tests.

## Start

**Install**

```bash
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
