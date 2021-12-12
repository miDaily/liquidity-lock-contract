import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const contractName = "ERC20Mock";
const version = "v1";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy(contractName, {
    from: deployer,
    log: true,
    args: ["Tether", "USDT"],
  });
};

export default func;
func.tags = [contractName, version];
func.id = contractName + version;
