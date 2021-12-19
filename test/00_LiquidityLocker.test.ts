import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { Contract, BigNumber } from "ethers";
import { ERC20Mock, LiquidityLocker, ERC20 } from "../typechain";
import { abi } from "@uniswap/v2-core/build/UniswapV2Pair.json";
import { Block } from "@ethersproject/abstract-provider";

chai.use(solidity);

describe("LiquidityLocker", function () {
  let deployer: string;
  let liquidityProvider1: string;
  let liquidityProvider2: string;
  let liquidityProvider1Signer: SignerWithAddress;
  let liquidityProvider2Signer: SignerWithAddress;
  let dailyCopContract: ERC20Mock;
  let tetherContract: ERC20Mock;
  let factoryContract: Contract;
  let routerContract: Contract;
  let liquidityLockerContract: LiquidityLocker;
  const initialAmountDailyCOPLP1 = ethers.utils.parseEther("500000000");
  const initialAmountDailyCOPLP2 = ethers.utils.parseEther("10000000");
  const initialAmountTetherLP1 = ethers.utils.parseEther("125000");
  const initialAmountTetherLP2 = ethers.utils.parseEther("2500");
  const amountDLYCOP = 4000;
  const amountTether = 1;
  const slippageTolerance = 0.5 / 100;
  const desiredAmountDLYCOP = ethers.utils.parseEther(amountDLYCOP.toString());
  const desiredAmountTether = ethers.utils.parseEther(amountTether.toString());
  const minAmountDLYCOP = ethers.utils.parseEther(
    ((1 - slippageTolerance) * amountDLYCOP).toString()
  );
  const minAmountTether = ethers.utils.parseEther(
    ((1 - slippageTolerance) * amountTether).toString()
  );

  before(async () => {
    // Get the accounts
    const accounts = await getNamedAccounts();
    deployer = accounts["deployer"];
    liquidityProvider1 = accounts["liquidityProvider1"];
    liquidityProvider2 = accounts["liquidityProvider2"];
    // Get the signers
    liquidityProvider1Signer = await ethers.getNamedSigner(
      "liquidityProvider1"
    );
    liquidityProvider2Signer = await ethers.getNamedSigner(
      "liquidityProvider2"
    );
  });

  beforeEach(async () => {
    // Make sure every test is started from a clean deployment fixture
    await deployments.fixture();

    dailyCopContract = await ethers.getContract("DailyCOPMock");
    tetherContract = await ethers.getContract("TetherMock");
    factoryContract = await ethers.getContract("UniswapV2Factory");
    routerContract = await ethers.getContract("UniswapV2Router02");
    liquidityLockerContract = await ethers.getContract("LiquidityLocker");

    await dailyCopContract.mint(liquidityProvider1, initialAmountDailyCOPLP1);
    await dailyCopContract.mint(liquidityProvider2, initialAmountDailyCOPLP2);
    await tetherContract.mint(liquidityProvider1, initialAmountTetherLP1);
    await tetherContract.mint(liquidityProvider2, initialAmountTetherLP2);
  });

  describe("Deploy", async () => {
    it("Should set the Uniswap router", async function () {
      expect(await liquidityLockerContract.router()).to.equal(
        routerContract.address
      );
    });
  });

  describe("Add liquidity validations", async () => {
    it("Should have the desired amount approved for both tokens in the pair", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const timestamp = block.timestamp;
      const deadline = timestamp + 60 * 20;
      const unlocktime = timestamp + 60 * 5;
      await expect(
        liquidityLockerContract
          .connect(liquidityProvider1Signer)
          .addAndLockLiquidity(
            {
              a: dailyCopContract.address,
              b: tetherContract.address,
            },
            { a: desiredAmountDLYCOP, b: desiredAmountTether },
            { a: minAmountDLYCOP, b: minAmountTether },
            deadline,
            unlocktime
          )
      ).to.be.revertedWith("Amount not approved");

      await dailyCopContract
        .connect(liquidityProvider1Signer)
        .approve(liquidityLockerContract.address, desiredAmountDLYCOP);

      await expect(
        liquidityLockerContract
          .connect(liquidityProvider1Signer)
          .addAndLockLiquidity(
            {
              a: dailyCopContract.address,
              b: tetherContract.address,
            },
            { a: desiredAmountDLYCOP, b: desiredAmountTether },
            { a: minAmountDLYCOP, b: minAmountTether },
            deadline,
            unlocktime
          )
      ).to.be.revertedWith("Amount not approved");

      await tetherContract
        .connect(liquidityProvider1Signer)
        .approve(liquidityLockerContract.address, desiredAmountTether);

      await expect(
        liquidityLockerContract
          .connect(liquidityProvider1Signer)
          .addAndLockLiquidity(
            {
              a: dailyCopContract.address,
              b: tetherContract.address,
            },
            { a: desiredAmountDLYCOP, b: desiredAmountTether },
            { a: minAmountDLYCOP, b: minAmountTether },
            deadline,
            unlocktime
          )
      ).to.not.be.reverted;
    });
  });

  describe("Add liquidity effects", async () => {
    let blockNumber: number;
    let block: Block;
    let timestamp: number;
    let deadline: number;
    let unlocktime: number;
    let liquitidyLockID: number;
    let beforeBalanceDailyCOPLP1: BigNumber;
    let beforeBalanceTetherLP1: BigNumber;
    let pairAddress: string;
    let pairContract: Contract;
    let liquidityLock: any;
    beforeEach(async () => {
      await dailyCopContract
        .connect(liquidityProvider1Signer)
        .approve(liquidityLockerContract.address, desiredAmountDLYCOP);
      await tetherContract
        .connect(liquidityProvider1Signer)
        .approve(liquidityLockerContract.address, desiredAmountTether);
      blockNumber = await ethers.provider.getBlockNumber();
      block = await ethers.provider.getBlock(blockNumber);
      timestamp = block.timestamp;
      deadline = timestamp + 60 * 20;
      unlocktime = timestamp + 60 * 5;
      beforeBalanceDailyCOPLP1 = await dailyCopContract.balanceOf(
        liquidityProvider1
      );
      beforeBalanceTetherLP1 = await tetherContract.balanceOf(
        liquidityProvider1
      );
      liquitidyLockID = Number(
        await liquidityLockerContract.nrOfLiquidityLocks()
      );
      // Add the liquidity
      liquidityLockerContract
        .connect(liquidityProvider1Signer)
        .addAndLockLiquidity(
          {
            a: dailyCopContract.address,
            b: tetherContract.address,
          },
          { a: desiredAmountDLYCOP, b: desiredAmountTether },
          { a: minAmountDLYCOP, b: minAmountTether },
          deadline,
          unlocktime
        );
      pairAddress = await factoryContract.getPair(
        dailyCopContract.address,
        tetherContract.address
      );
      pairContract = await ethers.getContractAt(abi, pairAddress);
      liquidityLock = await liquidityLockerContract.liquidityLocks(
        liquitidyLockID
      );
    });
    it("Should remove the desired Daily COP amount of the liquidity provider's balance", async function () {
      expect(await dailyCopContract.balanceOf(liquidityProvider1)).to.equal(
        beforeBalanceDailyCOPLP1.sub(desiredAmountDLYCOP)
      );
    });
    it("Should remove the desired Tether amount of the liquidity provider's balance", async function () {
      expect(await tetherContract.balanceOf(liquidityProvider1)).to.equal(
        beforeBalanceTetherLP1.sub(desiredAmountTether)
      );
    });
    it("Should add the desired Daily COP and Tether amounts to the pair's reserves", async function () {
      const reserves = await pairContract.getReserves();
      expect(reserves._reserve0).to.equal(desiredAmountDLYCOP);
      expect(reserves._reserve1).to.equal(desiredAmountTether);
    });
    it("Should mint liquidity pool token and lock it in the liquidity locker contract", async function () {
      const balanceLiquidityLocker = await pairContract.balanceOf(
        liquidityLockerContract.address
      );
      const totalPairSupply = await pairContract.totalSupply();
      const minimumLiquidity = await pairContract.MINIMUM_LIQUIDITY();

      expect(balanceLiquidityLocker).to.equal(
        totalPairSupply.sub(minimumLiquidity)
      );
    });
    it("Should not mint any liquidity pool tokens to the liquidity provider directly", async function () {
      const balanceLP1 = await pairContract.balanceOf(liquidityProvider1);
      expect(balanceLP1).to.equal(0);
    });
    it("LiquidityProvider should not be able to remove liquidity before time is passed", async function () {
      await expect(
        liquidityLockerContract
          .connect(liquidityProvider1Signer)
          .unlockAndRemoveLiquidity(
            liquitidyLockID,
            liquidityLock.liquidity,
            { a: minAmountDLYCOP, b: minAmountTether },
            deadline
          )
      ).to.be.revertedWith("Liquidity is still locked");
    });
    it("LiquidityProvider should not be able to remove liquidity through router directly", async function () {
      await expect(
        routerContract
          .connect(liquidityProvider1Signer)
          .removeLiquidity(
            dailyCopContract.address,
            tetherContract.address,
            liquidityLock.liquidity,
            minAmountDLYCOP,
            minAmountTether,
            liquidityProvider1,
            deadline
          )
      ).to.be.revertedWith("ds-math-sub-underflow");
    });
  });
});
