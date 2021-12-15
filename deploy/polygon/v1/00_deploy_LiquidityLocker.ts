import { DeployFunction } from "hardhat-deploy/types";

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
    ? await ethers.getContractAt("UniswapV2Router02", uniswapV2Router)
    : await ethers.getContract("UniswapV2Router02");

  await deploy(contractName, {
    from: deployer,
    log: true,
    args: [deployer, routerContract.address],
  });
};

export default func;
func.tags = [contractName, version];
func.id = contractName + version;
