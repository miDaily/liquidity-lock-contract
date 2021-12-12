import { expect } from "chai";
import { ethers, deployments } from "hardhat";

describe("Greeter", function () {
  beforeEach(async () => {
    // Make sure every test is started from a clean deployment fixture
    await deployments.fixture(["UniswapV2Factory", "ERC20Mock"]);
    const factoryContract = await ethers.getContract("UniswapV2Factory");
    console.log("Factory ethers address", factoryContract.address);
  });
  it("Should return the new greeting once it's changed", async function () {});
});
