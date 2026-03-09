import { HardhatUserConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });


const STC_RPC =
  process.env.NEXT_PUBLIC_RPC_URL ??
  "http://127.0.0.1:9650/ext/bc/2N6ekKdQUxdUFxFp8x6xPSXLod3a3sXzQiEWjVepbtXPFa4Uej/rpc";

const rawKey = process.env.STC_DEPLOYER_PRIVATE_KEY ?? "";
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
    stcnetwork: {
      type: "http",
      url: STC_RPC,
      chainId: 666999,
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