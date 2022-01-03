import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { LedgerSigner } from "@anders-t/ethers-ledger";
import { abi as erc20Abi } from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { abi as factoryAbi } from "@uniswap/v2-core/build/UniswapV2Factory.json";
import { abi as pairAbi } from "@uniswap/v2-core/build/UniswapV2Pair.json";
import { LiquidityLocker } from "../typechain";

// yarn hh-remove-liquidity-network polygon --lock-id 2 --liquidity 0.000790885634063788
task(
  "remove-liquidity",
  "Remove and get liquidity",
  async (args: { lockId: number; liquidity: number }, hre) => {
    const MAX_DECIMALS = 18;
    const { ethers, getNamedAccounts } = hre;
    const addresses = await getNamedAccounts();
    // Get all contracts
    const liquidityLockerContract: LiquidityLocker = await ethers.getContract(
      "LiquidityLocker"
    );
    // Get liquidity lock
    const liquidityLock = await liquidityLockerContract.liquidityLocks(
      args.lockId
    );
    const tokenA = liquidityLock.tokens.a;
    const tokenB = liquidityLock.tokens.b;
    const tokenAContract = await ethers.getContractAt(erc20Abi, tokenA);
    const tokenBContract = await ethers.getContractAt(erc20Abi, tokenB);

    const factoryContract = await ethers.getContractAt(
      factoryAbi,
      addresses["uniswapV2Factory"]
    );
    const pairContract = await ethers.getContractAt(
      pairAbi,
      factoryContract.getPair(tokenAContract.address, tokenBContract.address)
    );
    // Get the pool balances to calculate the part to remove
    const decimalsTokenA = (await tokenAContract.decimals()) || MAX_DECIMALS;
    const decimalsTokenB = (await tokenBContract.decimals()) || MAX_DECIMALS;
    const decimalsLiquidityToken =
      (await pairContract.decimals()) || MAX_DECIMALS;
    const liquidityTotalSupply = await pairContract.totalSupply();
    const poolBalanceOfTokenA = await tokenAContract.balanceOf(
      pairContract.address
    );
    const poolBalanceOfTokenB = await tokenBContract.balanceOf(
      pairContract.address
    );
    // Calculate the amount to get back based on the pool stats and the liquidity to remove
    const liquidity = ethers.utils.parseUnits(
      args.liquidity.toString(),
      decimalsLiquidityToken
    );
    const desiredAmountTokenA = liquidity
      .mul(poolBalanceOfTokenA)
      .div(liquidityTotalSupply);
    const desiredAmountTokenB = liquidity
      .mul(poolBalanceOfTokenB)
      .div(liquidityTotalSupply);

    // Calculate the minimum amounts based on a 1% slippage tolerance
    const slippageTolerance = 1 / 100;
    const minAmountTokenA = ethers.utils.parseUnits(
      (
        (1 - slippageTolerance) *
        Number(ethers.utils.formatUnits(desiredAmountTokenA, decimalsTokenA))
      ).toString(),
      decimalsTokenA
    );
    const minAmountTokenB = ethers.utils.parseUnits(
      (
        (1 - slippageTolerance) *
        Number(ethers.utils.formatUnits(desiredAmountTokenB, decimalsTokenB))
      ).toFixed(Number(decimalsTokenB)),
      decimalsTokenB
    );
    console.log(
      "minAmountTokenA",
      ethers.utils.formatUnits(minAmountTokenA, decimalsTokenA)
    );
    console.log(
      "minAmountTokenB",
      ethers.utils.formatUnits(minAmountTokenB, decimalsTokenB)
    );
    // Calculate 15 minutes deadline
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const deadline = block.timestamp + 15 * 60;

    // Use a Ledger as the signer
    const path = `m/44'/60'/0'/0/0`;
    const signer = new LedgerSigner(ethers.provider, path);
    const address = await signer.getAddress();

    // Remove the liquidity
    const tx = await liquidityLockerContract
      .connect(signer)
      .removeUnlockedLiquidity(
        args.lockId,
        liquidity,
        { a: minAmountTokenA, b: minAmountTokenB },
        deadline
      );

    console.log("Tx receipt", await tx.wait(2));
  }
)
  .addParam("lockId", "The ID of the lock to remove the liquidity from")
  .addParam("liquidity", "The amount of liquidty to remove");
