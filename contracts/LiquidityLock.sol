//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.6;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

//import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";
//import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract LiquidityLock {
  using SafeMath for uint256;

  address public factory;

  constructor(address _factory) public {
    factory = _factory;
  }

  function addLiquidity(
    IERC20 tokenA,
    IERC20 tokenB,
    uint256 amountA,
    uint256 amountB,
    uint256 locktime
  ) public {
    require(
      tokenA.allowance(msg.sender, address(this)) >= amountA,
      "Amount not approved"
    );
    require(
      tokenB.allowance(msg.sender, address(this)) >= amountB,
      "Amount not approved"
    );

    tokenA.transferFrom(msg.sender, address(this), amountA);
    tokenB.transferFrom(msg.sender, address(this), amountB);

    /*IUniswapV2Pair pair = IUniswapV2Pair(
      UniswapV2Library.pairFor(factory, address(tokenA), address(tokenB))
    );*/
  }

  function removeLiquidity(IERC20 _pairToken, uint256 _amount) public {
    // TODO: Check if the timelock for the amount already expired
  }
}
