import {
  bytecode as UniswapV2FactoryBytecode,
  abi as UniswapV2FactoryAbi,
} from "@uniswap/v2-core/build/UniswapV2Factory.json";
import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const contractName = "UniswapV2Factory";
const version = "v2";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy(contractName, {
    from: deployer,
    log: true,
    contract: {
      abi: UniswapV2FactoryAbi,
      bytecode: UniswapV2FactoryBytecode,
    },
    args: [deployer],
  });
};

export default func;
func.tags = [contractName, version];
func.id = contractName + version;
