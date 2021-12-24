//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/IUniswapV2Factory.sol";

contract LiquidityLocker {
  using Counters for Counters.Counter;
  using SafeERC20 for IERC20;

  struct Pair {
    IERC20 a;
    IERC20 b;
  }

  struct PairAmounts {
    uint256 a;
    uint256 b;
  }

  struct LiquidityAddition {
    PairAmounts tokenAmounts;
    uint256 liquidity;
  }

  struct LiquidityLock {
    Pair tokens;
    uint256 liquidity;
    uint256 unlocktime;
    address provider;
  }

  IUniswapV2Router public router;
  mapping(uint256 => LiquidityLock) public liquidityLocks;
  Counters.Counter public nrOfLiquidityLocks;

  modifier Allowance(IERC20 token, uint256 amount) {
    require(
      token.allowance(msg.sender, address(this)) >= amount,
      "Amount not approved"
    );
    _;
  }

  constructor(IUniswapV2Router _router) {
    router = _router;
  }

  function addAndLockLiquidity(
    Pair memory tokens,
    PairAmounts memory desiredAmounts,
    PairAmounts memory minAmounts,
    uint256 deadline,
    uint256 unlocktime
  )
    public
    Allowance(tokens.a, desiredAmounts.a)
    Allowance(tokens.b, desiredAmounts.b)
    returns (LiquidityAddition memory liquidityAddition)
  {
    require(unlocktime > block.timestamp, "Unlock time is before current time");

    tokens.a.safeTransferFrom(msg.sender, address(this), desiredAmounts.a);
    tokens.b.safeTransferFrom(msg.sender, address(this), desiredAmounts.b);
    tokens.a.safeApprove(address(router), desiredAmounts.a);
    tokens.b.safeApprove(address(router), desiredAmounts.b);

    liquidityAddition = _addLiquidityThroughRouter(
      tokens,
      desiredAmounts,
      minAmounts,
      deadline
    );

    liquidityLocks[nrOfLiquidityLocks.current()] = LiquidityLock({
      tokens: Pair(tokens.a, tokens.b),
      liquidity: liquidityAddition.liquidity,
      unlocktime: unlocktime,
      provider: msg.sender
    });
    nrOfLiquidityLocks.increment();
  }

  function removeUnlockedLiquidity(
    uint256 liquidityLockID,
    uint256 liquidity,
    PairAmounts memory minAmounts,
    uint256 deadline
  ) public returns (PairAmounts memory amounts) {
    LiquidityLock storage liquidityLock = liquidityLocks[liquidityLockID];

    require(
      block.timestamp >= liquidityLock.unlocktime,
      "Liquidity is still locked"
    );
    require(
      liquidityLock.provider == msg.sender,
      "Can only be removed by provider"
    );
    require(liquidityLock.liquidity >= liquidity, "Not enough left in lock");

    liquidityLock.liquidity -= liquidity;

    IERC20 pair = IERC20(
      IUniswapV2Factory(router.factory()).getPair(
        address(liquidityLock.tokens.a),
        address(liquidityLock.tokens.b)
      )
    );
    pair.safeApprove(address(router), liquidity);

    (amounts.a, amounts.b) = router.removeLiquidity(
      address(liquidityLock.tokens.a),
      address(liquidityLock.tokens.b),
      liquidity,
      minAmounts.a,
      minAmounts.b,
      msg.sender,
      deadline
    );
  }

  function _addLiquidityThroughRouter(
    Pair memory tokens,
    PairAmounts memory desiredAmounts,
    PairAmounts memory minAmounts,
    uint256 deadline
  ) internal returns (LiquidityAddition memory liquidityAddition) {
    (
      liquidityAddition.tokenAmounts.a,
      liquidityAddition.tokenAmounts.b,
      liquidityAddition.liquidity
    ) = router.addLiquidity(
      address(tokens.a),
      address(tokens.b),
      desiredAmounts.a,
      desiredAmounts.b,
      minAmounts.a,
      minAmounts.b,
      address(this),
      deadline
    );
  }
}
