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
  const initialAmountTetherLP1 = ethers.utils.parseUnits("125000", 6);
  const initialAmountTetherLP2 = ethers.utils.parseUnits("2500", 6);
  const amountDLYCOPLP1 = 38000000;
  const amountTetherLP1 = 9500;
  const amountDLYCOPLP2 = 4000;
  const amountTetherLP2 = 1;
  const slippageTolerance = 0.5 / 100;
  const desiredAmountDLYCOPLP1 = ethers.utils.parseEther(
    amountDLYCOPLP1.toString()
  );
  const desiredAmountTetherLP1 = ethers.utils.parseUnits(
    amountTetherLP1.toString(),
    6
  );
  const minAmountDLYCOPLP1 = ethers.utils.parseEther(
    ((1 - slippageTolerance) * amountDLYCOPLP1).toString()
  );
  const minAmountTetherLP1 = ethers.utils.parseUnits(
    ((1 - slippageTolerance) * amountTetherLP1).toString(),
    6
  );

  const desiredAmountDLYCOPLP2 = ethers.utils.parseEther(
    amountDLYCOPLP2.toString()
  );
  const desiredAmountTetherLP2 = ethers.utils.parseUnits(
    amountTetherLP2.toString(),
    6
  );
  const minAmountDLYCOPLP2 = ethers.utils.parseEther(
    ((1 - slippageTolerance) * amountDLYCOPLP2).toString()
  );
  const minAmountTetherLP2 = ethers.utils.parseUnits(
    ((1 - slippageTolerance) * amountTetherLP2).toString(),
    6
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

  describe("Add liquidity", async () => {
    let deadline: number;
    let unlocktime: number;
    let liquitidyLockID: number;
    let beforeBalanceDailyCOPLP1: BigNumber;
    let beforeBalanceTetherLP1: BigNumber;
    let pairAddress: string;
    let pairContract: Contract;
    beforeEach(async () => {
      await dailyCopContract
        .connect(liquidityProvider1Signer)
        .approve(liquidityLockerContract.address, initialAmountDailyCOPLP1);
      await tetherContract
        .connect(liquidityProvider1Signer)
        .approve(liquidityLockerContract.address, initialAmountTetherLP1);
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      deadline = block.timestamp + 60 * 20;
      unlocktime = block.timestamp + 60 * 5;
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
          { a: desiredAmountDLYCOPLP1, b: desiredAmountTetherLP1 },
          { a: minAmountDLYCOPLP1, b: minAmountTetherLP1 },
          deadline,
          unlocktime
        );
      pairAddress = await factoryContract.getPair(
        dailyCopContract.address,
        tetherContract.address
      );
      pairContract = await ethers.getContractAt(abi, pairAddress);
    });
    it("Should have the desired amount approved for both tokens in the pair", async function () {
      await expect(
        liquidityLockerContract
          .connect(liquidityProvider2Signer)
          .addAndLockLiquidity(
            {
              a: dailyCopContract.address,
              b: tetherContract.address,
            },
            { a: desiredAmountDLYCOPLP2, b: desiredAmountTetherLP2 },
            { a: minAmountDLYCOPLP2, b: minAmountTetherLP2 },
            deadline,
            unlocktime
          )
      ).to.be.revertedWith("Amount not approved");

      await dailyCopContract
        .connect(liquidityProvider2Signer)
        .approve(liquidityLockerContract.address, desiredAmountDLYCOPLP2);

      await expect(
        liquidityLockerContract
          .connect(liquidityProvider2Signer)
          .addAndLockLiquidity(
            {
              a: dailyCopContract.address,
              b: tetherContract.address,
            },
            { a: desiredAmountDLYCOPLP2, b: desiredAmountTetherLP2 },
            { a: minAmountDLYCOPLP2, b: minAmountTetherLP2 },
            deadline,
            unlocktime
          )
      ).to.be.revertedWith("Amount not approved");

      await tetherContract
        .connect(liquidityProvider2Signer)
        .approve(liquidityLockerContract.address, desiredAmountTetherLP2);

      await expect(
        liquidityLockerContract
          .connect(liquidityProvider2Signer)
          .addAndLockLiquidity(
            {
              a: dailyCopContract.address,
              b: tetherContract.address,
            },
            { a: desiredAmountDLYCOPLP2, b: desiredAmountTetherLP2 },
            { a: minAmountDLYCOPLP2, b: minAmountTetherLP2 },
            deadline,
            unlocktime
          )
      ).to.not.be.reverted;
    });
    it("Should have an unlocktime after the current time", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      unlocktime = block.timestamp - 1;

      await expect(
        liquidityLockerContract
          .connect(liquidityProvider1Signer)
          .addAndLockLiquidity(
            {
              a: dailyCopContract.address,
              b: tetherContract.address,
            },
            { a: desiredAmountDLYCOPLP1, b: desiredAmountTetherLP1 },
            { a: minAmountDLYCOPLP1, b: minAmountTetherLP1 },
            deadline,
            unlocktime
          )
      ).to.be.revertedWith("Unlock time is before current time");
    });
    it("Should remove the desired Daily COP amount of the liquidity provider's balance", async function () {
      expect(await dailyCopContract.balanceOf(liquidityProvider1)).to.equal(
        beforeBalanceDailyCOPLP1.sub(desiredAmountDLYCOPLP1)
      );
    });
    it("Should remove the desired Tether amount of the liquidity provider's balance", async function () {
      expect(await tetherContract.balanceOf(liquidityProvider1)).to.equal(
        beforeBalanceTetherLP1.sub(desiredAmountTetherLP1)
      );
    });
    it("Should add the desired Daily COP and Tether amounts to the pair's reserves", async function () {
      const reserves = await pairContract.getReserves();
      expect(reserves._reserve0).to.equal(desiredAmountDLYCOPLP1);
      expect(reserves._reserve1).to.equal(desiredAmountTetherLP1);
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
    it("Should store the liquidity lock with the correct information", async function () {
      const liquidityLock = await liquidityLockerContract.liquidityLocks(
        liquitidyLockID
      );

      const totalPairSupply = await pairContract.totalSupply();
      const minimumLiquidity = await pairContract.MINIMUM_LIQUIDITY();
      expect(liquidityLock.tokens.a).to.be.equal(dailyCopContract.address);
      expect(liquidityLock.tokens.b).to.be.equal(tetherContract.address);
      expect(liquidityLock.liquidity).to.be.equal(
        totalPairSupply.sub(minimumLiquidity)
      );
      expect(liquidityLock.unlocktime).to.equal(unlocktime);
      expect(liquidityLock.provider).to.equal(liquidityProvider1);
    });
    it("Should increment the number of liquidity locks", async function () {
      expect(await liquidityLockerContract.nrOfLiquidityLocks()).to.equal(
        liquitidyLockID + 1
      );
    });
  });

  describe("Remove Liquidity", async () => {
    let unlocktimeLP1: number;
    let unlocktimeLP2: number;
    let liquitidyLockIDLP1: number;
    let liquitidyLockIDLP2: number;
    let beforeBalanceDailyCOPLP1: BigNumber;
    let beforeBalanceTetherLP1: BigNumber;
    let beforeBalanceDailyCOPLP2: BigNumber;
    let beforeBalanceTetherLP2: BigNumber;
    let pairAddress: string;
    let pairContract: Contract;
    let beforeLiquidityLockLP1: any;
    let beforeLiquidityLockLP2: any;
    let beforeLiquidityLockerPairBalance: BigNumber;
    let beforeReserve0: BigNumber;
    let beforeReserve1: BigNumber;
    beforeEach(async () => {
      await dailyCopContract
        .connect(liquidityProvider1Signer)
        .approve(liquidityLockerContract.address, desiredAmountDLYCOPLP1);
      await tetherContract
        .connect(liquidityProvider1Signer)
        .approve(liquidityLockerContract.address, desiredAmountTetherLP1);
      await dailyCopContract
        .connect(liquidityProvider2Signer)
        .approve(liquidityLockerContract.address, desiredAmountDLYCOPLP2);
      await tetherContract
        .connect(liquidityProvider2Signer)
        .approve(liquidityLockerContract.address, desiredAmountTetherLP2);
      let blockNumber = await ethers.provider.getBlockNumber();
      let block = await ethers.provider.getBlock(blockNumber);
      let timestamp = block.timestamp;
      const deadlineLP1 = timestamp + 60 * 20;
      unlocktimeLP1 = timestamp + 60 * 5;
      liquitidyLockIDLP1 = Number(
        await liquidityLockerContract.nrOfLiquidityLocks()
      );
      // Add liquidity with LP1
      liquidityLockerContract
        .connect(liquidityProvider1Signer)
        .addAndLockLiquidity(
          {
            a: dailyCopContract.address,
            b: tetherContract.address,
          },
          { a: desiredAmountDLYCOPLP1, b: desiredAmountTetherLP1 },
          { a: minAmountDLYCOPLP1, b: minAmountTetherLP1 },
          deadlineLP1,
          unlocktimeLP1
        );
      // Add liquidity with LP2
      blockNumber = await ethers.provider.getBlockNumber();
      block = await ethers.provider.getBlock(blockNumber);
      timestamp = block.timestamp;
      const deadlineLP2 = timestamp + 60 * 20;
      unlocktimeLP2 = timestamp + 60 * 10;
      liquitidyLockIDLP2 = Number(
        await liquidityLockerContract.nrOfLiquidityLocks()
      );
      liquidityLockerContract
        .connect(liquidityProvider2Signer)
        .addAndLockLiquidity(
          {
            a: dailyCopContract.address,
            b: tetherContract.address,
          },
          { a: desiredAmountDLYCOPLP2, b: desiredAmountTetherLP2 },
          { a: minAmountDLYCOPLP2, b: minAmountTetherLP2 },
          deadlineLP2,
          unlocktimeLP2
        );
      // Get liquidity pair details
      pairAddress = await factoryContract.getPair(
        dailyCopContract.address,
        tetherContract.address
      );
      pairContract = await ethers.getContractAt(abi, pairAddress);
      // Before values
      beforeBalanceDailyCOPLP1 = await dailyCopContract.balanceOf(
        liquidityProvider1
      );
      beforeBalanceTetherLP1 = await tetherContract.balanceOf(
        liquidityProvider1
      );
      beforeLiquidityLockLP1 = await liquidityLockerContract.liquidityLocks(
        liquitidyLockIDLP1
      );
      beforeBalanceDailyCOPLP2 = await dailyCopContract.balanceOf(
        liquidityProvider2
      );
      beforeBalanceTetherLP2 = await tetherContract.balanceOf(
        liquidityProvider2
      );
      beforeLiquidityLockLP2 = await liquidityLockerContract.liquidityLocks(
        liquitidyLockIDLP2
      );
      beforeLiquidityLockerPairBalance = await pairContract.balanceOf(
        liquidityLockerContract.address
      );
      const beforeReserve = await pairContract.getReserves();
      beforeReserve0 = beforeReserve._reserve0;
      beforeReserve1 = beforeReserve._reserve1;
    });
    it("LiquidityProvider should not be able to remove liquidity before time is passed", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const deadline = block.timestamp + 60 * 20;
      await expect(
        liquidityLockerContract
          .connect(liquidityProvider1Signer)
          .removeUnlockedLiquidity(
            liquitidyLockIDLP1,
            beforeLiquidityLockLP1.liquidity,
            { a: minAmountDLYCOPLP1, b: minAmountTetherLP1 },
            deadline
          )
      ).to.be.revertedWith("Liquidity is still locked");
      await expect(
        liquidityLockerContract
          .connect(liquidityProvider2Signer)
          .removeUnlockedLiquidity(
            liquitidyLockIDLP2,
            beforeLiquidityLockLP2.liquidity,
            { a: minAmountDLYCOPLP1, b: minAmountTetherLP2 },
            deadline
          )
      ).to.be.revertedWith("Liquidity is still locked");
    });
    it("LiquidityProvider should not be able to remove liquidity through router directly", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const deadline = block.timestamp + 60 * 20;
      await expect(
        routerContract
          .connect(liquidityProvider1Signer)
          .removeLiquidity(
            dailyCopContract.address,
            tetherContract.address,
            beforeLiquidityLockLP1.liquidity,
            minAmountDLYCOPLP1,
            minAmountTetherLP1,
            liquidityProvider1,
            deadline
          )
      ).to.be.revertedWith("ds-math-sub-underflow");
    });
    it("Should not be able to be removed by other liquidity provider", async function () {
      await ethers.provider.send("evm_mine", [unlocktimeLP1 + 1]);
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const deadline = block.timestamp + 60 * 20;

      await expect(
        liquidityLockerContract
          .connect(liquidityProvider2Signer)
          .removeUnlockedLiquidity(
            liquitidyLockIDLP1,
            beforeLiquidityLockLP1.liquidity,
            { a: minAmountDLYCOPLP1, b: minAmountTetherLP1 },
            deadline
          )
      ).to.be.revertedWith("Can only be removed by provider");

      await ethers.provider.send("evm_mine", [unlocktimeLP2 + 1]);
      const blockNumber2 = await ethers.provider.getBlockNumber();
      const block2 = await ethers.provider.getBlock(blockNumber2);
      const deadline2 = block2.timestamp + 60 * 20;

      await expect(
        liquidityLockerContract
          .connect(liquidityProvider1Signer)
          .removeUnlockedLiquidity(
            liquitidyLockIDLP2,
            beforeLiquidityLockLP2.liquidity,
            { a: minAmountDLYCOPLP2, b: minAmountTetherLP2 },
            deadline2
          )
      ).to.be.revertedWith("Can only be removed by provider");
    });
    it("Should not be able to remove a negative liquidity token amount", async function () {
      await ethers.provider.send("evm_mine", [unlocktimeLP1 + 1]);
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const deadline = block.timestamp + 60 * 20;

      await expect(
        liquidityLockerContract
          .connect(liquidityProvider1Signer)
          .removeUnlockedLiquidity(
            liquitidyLockIDLP1,
            beforeLiquidityLockLP1.liquidity.mul(-1),
            { a: minAmountDLYCOPLP1, b: minAmountTetherLP1 },
            deadline
          )
      ).to.be.reverted;
    });
    it("Should not be able to remove more than liquidity in the lock", async function () {
      await ethers.provider.send("evm_mine", [unlocktimeLP1 + 1]);
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const deadline = block.timestamp + 60 * 20;
      expect(
        liquidityLockerContract
          .connect(liquidityProvider1Signer)
          .removeUnlockedLiquidity(
            liquitidyLockIDLP1,
            beforeLiquidityLockLP1.liquidity + 1,
            { a: minAmountDLYCOPLP1, b: minAmountTetherLP1 },
            deadline
          )
      ).to.be.revertedWith("Not enough left in lock");
    });
    it("Should be able to remove liquidity after time of locks has passed", async function () {
      await ethers.provider.send("evm_mine", [unlocktimeLP1 + 1]);
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const deadline = block.timestamp + 60 * 20;

      await liquidityLockerContract
        .connect(liquidityProvider1Signer)
        .removeUnlockedLiquidity(
          liquitidyLockIDLP1,
          beforeLiquidityLockLP1.liquidity,
          { a: minAmountDLYCOPLP1, b: minAmountTetherLP1 },
          deadline
        );

      const afterFirstRemovalReserve = await pairContract.getReserves();
      const afterFirstRemovalReserve0: BigNumber =
        afterFirstRemovalReserve._reserve0;
      const afterFirstRemovalReserve1: BigNumber =
        afterFirstRemovalReserve._reserve1;
      const afterBalanceDailyCOPLP1 = await dailyCopContract.balanceOf(
        liquidityProvider1
      );
      const afterBalanceTetherLP1 = await tetherContract.balanceOf(
        liquidityProvider1
      );
      const afterLiquidityLockLP1 =
        await liquidityLockerContract.liquidityLocks(liquitidyLockIDLP1);
      const afterLiquidityLockerPairBalance = await pairContract.balanceOf(
        liquidityLockerContract.address
      );

      await ethers.provider.send("evm_mine", [unlocktimeLP2 + 1]);
      const blockNumber2 = await ethers.provider.getBlockNumber();
      const block2 = await ethers.provider.getBlock(blockNumber2);
      const deadline2 = block2.timestamp + 60 * 20;

      await liquidityLockerContract
        .connect(liquidityProvider2Signer)
        .removeUnlockedLiquidity(
          liquitidyLockIDLP2,
          beforeLiquidityLockLP2.liquidity,
          { a: minAmountDLYCOPLP2, b: minAmountTetherLP2 },
          deadline2
        );

      const afterSecondRemovalReserve = await pairContract.getReserves();
      const afterSecondRemovalReserve0: BigNumber =
        afterSecondRemovalReserve._reserve0;
      const afterSecondRemovalReserve1: BigNumber =
        afterSecondRemovalReserve._reserve1;
      const afterBalanceDailyCOPLP2 = await dailyCopContract.balanceOf(
        liquidityProvider2
      );
      const afterBalanceTetherLP2 = await tetherContract.balanceOf(
        liquidityProvider2
      );
      const afterLiquidityLockLP2 =
        await liquidityLockerContract.liquidityLocks(liquitidyLockIDLP2);
      const afterLiquidityLockerPairBalance2 = await pairContract.balanceOf(
        liquidityLockerContract.address
      );

      expect(Number(afterBalanceDailyCOPLP1)).to.be.greaterThan(
        Number(beforeBalanceDailyCOPLP1)
      );
      expect(beforeReserve0.sub(afterFirstRemovalReserve0)).to.equal(
        afterBalanceDailyCOPLP1.sub(beforeBalanceDailyCOPLP1)
      );
      expect(Number(afterBalanceTetherLP1)).to.be.greaterThan(
        Number(beforeBalanceTetherLP1)
      );
      expect(beforeReserve1.sub(afterFirstRemovalReserve1)).to.equal(
        afterBalanceTetherLP1.sub(beforeBalanceTetherLP1)
      );
      expect(afterLiquidityLockLP1.liquidity).to.equal(0);
      expect(afterLiquidityLockerPairBalance).to.equal(
        beforeLiquidityLockerPairBalance.sub(beforeLiquidityLockLP1.liquidity)
      );

      expect(Number(afterBalanceDailyCOPLP2)).to.be.greaterThan(
        Number(beforeBalanceDailyCOPLP2)
      );
      expect(
        afterFirstRemovalReserve0.sub(afterSecondRemovalReserve0)
      ).to.equal(afterBalanceDailyCOPLP2.sub(beforeBalanceDailyCOPLP2));
      expect(Number(afterBalanceTetherLP2)).to.be.greaterThan(
        Number(beforeBalanceTetherLP2)
      );
      expect(
        afterFirstRemovalReserve1.sub(afterSecondRemovalReserve1)
      ).to.equal(afterBalanceTetherLP2.sub(beforeBalanceTetherLP2));
      expect(afterLiquidityLockLP2.liquidity).to.equal(0);
      expect(afterLiquidityLockerPairBalance2).to.equal(
        afterLiquidityLockerPairBalance.sub(beforeLiquidityLockLP2.liquidity)
      );
    });
    it("Should be able to remove the liquidity in parts", async function () {
      await ethers.provider.send("evm_mine", [unlocktimeLP1 + 1]);
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const deadline = block.timestamp + 60 * 20;
      const liquidity: BigNumber = beforeLiquidityLockLP1.liquidity;
      const liquidityPart: BigNumber = liquidity.div(2);
      await liquidityLockerContract
        .connect(liquidityProvider1Signer)
        .removeUnlockedLiquidity(
          liquitidyLockIDLP1,
          liquidityPart,
          { a: minAmountDLYCOPLP1.div(2), b: minAmountTetherLP1.div(2) },
          deadline
        );
      let afterFirstRemovalLiquidityLockLP1 =
        await liquidityLockerContract.liquidityLocks(liquitidyLockIDLP1);
      let afterFirstRemovalPairBalance = await pairContract.balanceOf(
        liquidityLockerContract.address
      );

      const blockNumber2 = await ethers.provider.getBlockNumber();
      const block2 = await ethers.provider.getBlock(blockNumber2);
      const deadline2 = block2.timestamp + 60 * 20;
      await liquidityLockerContract
        .connect(liquidityProvider1Signer)
        .removeUnlockedLiquidity(
          liquitidyLockIDLP1,
          afterFirstRemovalLiquidityLockLP1.liquidity,
          { a: minAmountDLYCOPLP1.div(2), b: minAmountTetherLP1.div(2) },
          deadline2
        );
      let afterSecondRemovalLiquidityLockLP1 =
        await liquidityLockerContract.liquidityLocks(liquitidyLockIDLP1);

      expect(afterFirstRemovalLiquidityLockLP1.liquidity).to.equal(
        beforeLiquidityLockLP1.liquidity.sub(liquidityPart)
      );
      expect(afterFirstRemovalPairBalance).to.equal(
        beforeLiquidityLockerPairBalance.sub(liquidityPart)
      );
      expect(afterSecondRemovalLiquidityLockLP1.liquidity).to.equal(0);
      expect(
        await pairContract.balanceOf(liquidityLockerContract.address)
      ).to.equal(beforeLiquidityLockerPairBalance.sub(liquidity));
    });
  });
});
