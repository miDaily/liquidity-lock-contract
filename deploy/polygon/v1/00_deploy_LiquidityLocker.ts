import { DeployFunction } from "hardhat-deploy/types";
import { abi as routerAbi } from "@uniswap/v2-periphery/build/UniswapV2Router02.json";

const contractName = "LiquidityLocker";
const version = "v1";

const func: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
  ethers,
}) {
  const { deploy } = deployments;
  const { deployer, uniswapV2Router } = await getNamedAccounts();
  let routerContract = uniswapV2Router
    ? await ethers.getContractAt(routerAbi, uniswapV2Router)
    : await ethers.getContract("UniswapV2Router02");

  await deploy(contractName, {
    from: deployer,
    log: true,
    args: [routerContract.address],
  });
};

export default func;
func.tags = [contractName, version];
func.id = contractName + version;
