import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import { node_url, accounts } from "./utils/network";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
import "./tasks/addAndLockLiquidity";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      accounts: accounts(),
      initialBaseFeePerGas: 0, // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
      deploy: ["deploy/hardhat/v1", "deploy/polygon/v1"],
      tags: ["test", "local"],
    },
    mumbai: {
      chainId: 80001,
      url: node_url("mumbai"),
      accounts: accounts("mumbai"),
      deploy: ["deploy/polygon/v1"],
      tags: ["staging"],
    },
    polygon: {
      url: node_url("polygon"),
      accounts: accounts("polygon"),
      deploy: ["deploy/polygon/v1"],
      tags: ["production"],
    },
  },
  namedAccounts: {
    deployer: 0,
    liquidityProvider1: 1,
    liquidityProvider2: 2,
    uniswapV2Factory: {
      polygon: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
    },
    uniswapV2Router: {
      polygon: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    },
    dailyCOP: {
      polygon: "0x1659fFb2d40DfB1671Ac226A0D9Dcc95A774521A",
    },
    tether: {
      polygon: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY,
  },
};

export default config;
