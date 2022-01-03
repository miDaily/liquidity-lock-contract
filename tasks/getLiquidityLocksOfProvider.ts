import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { LiquidityLocker } from "../typechain";

// DLYCOP/USDT:
// yarn hh-get-liquidity-network polygon --provider 0xDc06124233a1Dc0571F5F27F99831539AcFc2053
task(
  "get-liquidity",
  "Get the liquidity a provider has locked",
  async (
    args: {
      provider: string;
    },
    hre
  ) => {
    const { ethers } = hre;
    // Get all contracts
    const liquidityLockerContract: LiquidityLocker = await ethers.getContract(
      "LiquidityLocker"
    );
    const blockOfDeployment = 23310875;
    const filter = liquidityLockerContract.filters.LiquidityLocked(
      undefined,
      args.provider
    );

    console.log(
      await liquidityLockerContract.queryFilter(filter, blockOfDeployment)
    );
  }
).addParam("provider", "The provider you want to get all liquidity locks from");
