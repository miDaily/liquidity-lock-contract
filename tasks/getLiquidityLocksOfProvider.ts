import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { LedgerSigner } from "@anders-t/ethers-ledger";
import { abi as erc20Abi } from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { abi as factoryAbi } from "@uniswap/v2-core/build/UniswapV2Factory.json";
import { abi as pairAbi } from "@uniswap/v2-core/build/UniswapV2Pair.json";
import { LiquidityLocker, ERC20 } from "../typechain";

// DLYCOP/USDT:
// yarn hh-get-liquidity polygon --provider 0xDc06124233a1Dc0571F5F27F99831539AcFc2053
task(
  "get-liquidity",
  "Get the liquidity a provider has locked",
  async (
    args: {
      provider: string;
    },
    hre
  ) => {
    const MAX_DECIMALS = 18;
    const { ethers, getNamedAccounts } = hre;
    const addresses = await getNamedAccounts();
    // Get all contracts
    const liquidityLockerContract: LiquidityLocker = await ethers.getContract(
      "LiquidityLocker"
    );
    const filter = liquidityLockerContract.filters.LiquidityLocked(
      null,
      args.provider
    );
    console.log(await liquidityLockerContract.queryFilter(filter));
  }
).addParam("provider", "The provider you want to get all liquidity locks from");
