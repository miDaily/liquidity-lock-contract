import {
  bytecode as UniswapV2Router02Bytecode,
  abi as UniswapV2Router02Abi,
} from "@uniswap/v2-periphery/build/UniswapV2Router02.json";
import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const contractName = "UniswapV2Router02";
const version = "v2";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const factoryContract = await ethers.getContract("UniswapV2Factory");
  const wrappedEtherContract = await ethers.getContract("WETHMock");

  await deploy(contractName, {
    from: deployer,
    log: true,
    contract: {
      abi: UniswapV2Router02Abi,
      bytecode: UniswapV2Router02Bytecode,
    },
    args: [factoryContract.address, wrappedEtherContract.address],
  });
};

export default func;
func.tags = [contractName, version];
func.id = contractName + version;
