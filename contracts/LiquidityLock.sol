//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LiquidityLock {
  IERC20 public token;

  constructor(IERC20 _token) {
    token = _token;
  }

  function addLiquidity(
    IERC20 _pairToken,
    uint256 _amount,
    uint256 _locktime
  ) public {
    require(
      _pairToken.allowance(msg.sender, address(this)) >= _amount,
      "Amount not approved"
    );
  }

  function removeLiquidity(IERC20 _pairToken, uint256 _amount) public {
    // TODO: Check if the timelock for the amount already expired
  }
}
