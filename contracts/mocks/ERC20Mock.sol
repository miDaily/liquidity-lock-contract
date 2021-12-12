// SPDX-License-Identifier: MIT
pragma solidity ^0.6.6;

import "@openzeppelin/contracts/presets/ERC20PresetMinterPauser.sol";

contract ERC20Mock is ERC20PresetMinterPauser {
  constructor(string memory _name, string memory _symbol)
    public
    ERC20PresetMinterPauser(_name, _symbol)
  {}
}
