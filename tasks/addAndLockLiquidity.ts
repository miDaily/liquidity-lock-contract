import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import { LedgerSigner } from "@anders-t/ethers-ledger";
import { abi as erc20Abi } from "@openzeppelin/contracts/build/contracts/ERC20.json";
import { abi as factoryAbi } from "@uniswap/v2-core/build/UniswapV2Factory.json";
import { abi as pairAbi } from "@uniswap/v2-core/build/UniswapV2Pair.json";

// yarn hh-add-liquidity-network polygon --token-a 0x1659fFb2d40DfB1671Ac226A0D9Dcc95A774521A --token-b 0xc2132d05d31c914a87c6611c10748aeb04b58e8f --amount-token-a 4000 --lock-duration 300
task(
  "add-liquidity",
  "Add and lock liquidity",
  async (
    args: {
      tokenA: string;
      tokenB: string;
      amountTokenA: string;
      lockDuration: number;
    },
    hre
  ) => {
    const MAX_DECIMALS = 18;
    const { ethers, getNamedAccounts } = hre;
    const addresses = await getNamedAccounts();
    // Get all contracts
    const tokenAContract = await ethers.getContractAt(erc20Abi, args.tokenA);
    const tokenBContract = await ethers.getContractAt(erc20Abi, args.tokenB);
    const liquidityLockerContract = await ethers.getContract("LiquidityLocker");
    const factoryContract = await ethers.getContractAt(
      factoryAbi,
      addresses["uniswapV2Factory"]
    );
    const pairContract = await ethers.getContractAt(
      pairAbi,
      factoryContract.getPair(tokenAContract.address, tokenBContract.address)
    );
    // Calculate the amount of token B for the amount of token A at the current price
    const decimalsTokenA = await tokenAContract.decimals();
    const decimalsTokenB = await tokenBContract.decimals();
    const reserves = await pairContract.getReserves();
    const reserveTokenA = Number(
      reserves._reserve0.mul(10 ** (MAX_DECIMALS - decimalsTokenA))
    );
    const reserveTokenB = Number(
      reserves._reserve1.mul(10 ** (MAX_DECIMALS - decimalsTokenB))
    );
    const reserveBToARatio = reserveTokenB / reserveTokenA;
    const amountTokenB = reserveBToARatio * Number(args.amountTokenA);

    const desiredAmountTokenA = ethers.utils.parseUnits(
      args.amountTokenA,
      decimalsTokenA
    );
    const desiredAmountTokenB = ethers.utils.parseUnits(
      amountTokenB.toFixed(6),
      decimalsTokenB
    );

    // Calculate the minimum amounts based on a 1% slippage tolerance
    const slippageTolerance = 1 / 100;
    const minAmountTokenA = ethers.utils.parseUnits(
      ((1 - slippageTolerance) * Number(args.amountTokenA)).toString(),
      decimalsTokenA
    );
    const minAmountTokenB = ethers.utils.parseUnits(
      ((1 - slippageTolerance) * amountTokenB).toFixed(6),
      decimalsTokenB
    );
    console.log("minAmountTokenA", Number(minAmountTokenA));
    console.log("minAmountTokenB", Number(minAmountTokenB));
    // Calculate 5 minutes deadline
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const deadline = block.timestamp + 15 * 60;
    // Calculate the timestamp of when the liquidity should be unlocked
    const unlockTime = block.timestamp + Number(args.lockDuration);

    console.log("DesiredAmountA", Number(desiredAmountTokenA));
    console.log("DesiredAmountB", Number(desiredAmountTokenB));
    console.log("MinAmountA", Number(minAmountTokenA));
    console.log("MinAmountB", Number(minAmountTokenB));
    console.log("Deadline", deadline);
    console.log("UnlockTime", unlockTime);

    // Use a Ledger as the signer
    const path = `m/44'/60'/0'/0/0`;
    const signer = new LedgerSigner(ethers.provider, path);
    const address = await signer.getAddress();
    console.log("Ledger address", address);
    console.log("LL contract", liquidityLockerContract);
    console.log("Liquidity Locker address", liquidityLockerContract.address);

    // Approve the desired amounts
    await tokenAContract
      .connect(signer)
      .approve(liquidityLockerContract.address, desiredAmountTokenA);
    console.log(
      "Approved A",
      await tokenAContract.allowance(
        await signer.getAddress(),
        liquidityLockerContract.address
      )
    );
    await tokenBContract
      .connect(signer)
      .approve(liquidityLockerContract.address, desiredAmountTokenB);
    console.log(
      "Approved B",
      await tokenBContract.allowance(
        await signer.getAddress(),
        liquidityLockerContract.address
      )
    );

    // Add the liquidity
    await liquidityLockerContract
      .connect(signer)
      .addAndLockLiquidity(
        { a: args.tokenA, b: args.tokenB },
        { a: desiredAmountTokenA, b: desiredAmountTokenB },
        { a: minAmountTokenA, b: minAmountTokenB },
        deadline,
        unlockTime
      );
  }
)
  .addParam("tokenA", "The first token of the pair")
  .addParam("tokenB", "The second token of the pair")
  .addParam("amountTokenA", "The amount of the first token to add")
  .addParam(
    "lockDuration",
    "The time in seconds that have to pass to be able to take the added liqudity out agin"
  );
