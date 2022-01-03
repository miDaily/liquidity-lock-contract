// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract ERC20Mock is ERC20PresetMinterPauser {
  uint8 private d;

  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) ERC20PresetMinterPauser(_name, _symbol) {
    d = _decimals;
  }

  function decimals() public view virtual override(ERC20) returns (uint8) {
    return d;
  }
}
