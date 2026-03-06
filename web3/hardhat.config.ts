import { HardhatUserConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ============================================================
// BRIDGESTONE — Avalanche L1 on Fuji Testnet
// Chain ID   : 777000 | Token: VELD
// RPC Port   : 9654
// ============================================================

const APEX_RPC =
  process.env.NEXT_PUBLIC_RPC_URL ??
  "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc";

const rawKey = process.env.VELD_DEPLOYER_PRIVATE_KEY ?? "";
const accounts = rawKey ? [`0x${rawKey.replace(/^0x/, "")}`] : [];

const config: HardhatUserConfig & { plugins?: any[] } = {
  plugins: [hardhatEthers],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    apexnetwork: {
      type: "http",
      url: APEX_RPC,
      chainId: 777000,
      accounts,
      timeout: 120_000,
    },
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
    },
  },

  paths: {
    artifacts: "./src/abis",
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
  },
};

export default config;