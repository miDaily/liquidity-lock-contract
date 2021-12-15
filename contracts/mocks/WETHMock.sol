// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";

abstract contract WETHMock is ERC20PresetMinterPauser, IWETH {
  constructor(string memory _name, string memory _symbol)
    ERC20PresetMinterPauser(_name, _symbol){}

    function transfer(address recipient, uint256 amount) public virtual override(ERC20, IWETH) returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

}
