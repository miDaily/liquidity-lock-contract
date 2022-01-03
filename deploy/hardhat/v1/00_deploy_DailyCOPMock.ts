import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const contractName = "DailyCOPMock";
const version = "v1";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy(contractName, {
    from: deployer,
    log: true,
    contract: "ERC20Mock",
    args: ["Daily COP", "DLYCOP", 18],
  });
};

export default func;
func.tags = [contractName, version];
func.id = contractName + version;
