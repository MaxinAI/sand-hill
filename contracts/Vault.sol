// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}

interface IWETH is IERC20 {
    function deposit() external payable;
}

contract Vault {
    ISwapRouter public immutable swapRouter;
    uint public constant EXPIRY = 3 * 365 days;

    address public immutable admin;
    address public immutable beneficiary;
    address public immutable feeRecipient;
    address public immutable developer;
    uint public immutable expiration;

    uint public stableSold;
    uint public stableBought;
    bool public sellingCrypto;
    bool public unlocked;

    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;

    uint24 public constant feeTier = 500;

    constructor(address _admin, address _beneficiary, address _feeRecipient, address _developer, address _swapRouter) {
        admin = _admin;
        beneficiary = _beneficiary;
        feeRecipient = _feeRecipient;
        developer = _developer;
        expiration = block.timestamp + EXPIRY;
        swapRouter = ISwapRouter(_swapRouter);
    }

    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary, "Only beneficiary can call this");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }


    /// Internals

    function safeApprove(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.approve.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Not approved");
    }

    function distributeFees() internal {
        if (stableBought > stableSold) {
            uint profit = stableBought - stableSold;
            uint fee = (profit * 20) / 100;
            uint developerFee = (profit * 20) / 100; // 20% goes to developer
            uint fundFee = fee - developerFee; // 80% goes to fund address
            require(IERC20(USDC).transfer(feeRecipient, fundFee));
            require(IERC20(USDC).transfer(developer, developerFee));
        }
    }

    /// Admin operations

    function buy(uint _amount, uint _crypto, address _token) external onlyAdmin {
        require(!sellingCrypto, "Already selling crypto");
        require(_token == WETH || _token == WBTC, "Invalid token");

        // Actual swap
        safeApprove(USDC, address(swapRouter), _amount);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: USDC,
            tokenOut: _token,
            fee: feeTier,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: _amount,
            amountOutMinimum: _crypto,
            sqrtPriceLimitX96: 0
        });
        swapRouter.exactInputSingle(params);

        stableSold += _amount;
    }

    function sell(uint _crypto, uint _amount, address _token) external onlyAdmin {
        require(sellingCrypto, "Not selling crypto");
        require(_token == WETH || _token == WBTC, "Invalid token");

        safeApprove(_token, address(swapRouter), _crypto);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: _token,
            tokenOut: USDC,
            fee: feeTier,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: _crypto,
            amountOutMinimum: _amount,
            sqrtPriceLimitX96: 0
        });
        uint amountOut = swapRouter.exactInputSingle(params);
        stableBought += amountOut;
    }

    function sellCrypto() external onlyAdmin {
        require(!sellingCrypto, "Already selling crypto");
        sellingCrypto = true;
    }


    function unlock() external onlyAdmin {
        require(!unlocked, "Already unlocked");
        distributeFees();
        unlocked = true;
    }

    // Beneficiary operations

    function transferOut(address _token) internal {
        IERC20 tokenContract = IERC20(_token);
        uint tokenBalance = tokenContract.balanceOf(address(this));
        if (tokenBalance > 0) {
            require(tokenContract.transfer(beneficiary, tokenBalance));
        }
    }

    function withdraw() external onlyBeneficiary {
        require(unlocked || block.timestamp >= expiration, "Cannot withdraw now");
        if (!unlocked) {
            unlocked = true;
            distributeFees();
        }
        transferOut(USDC);
        transferOut(WETH);
        transferOut(WBTC);
    }
}

contract VaultManager {
    address public immutable admin;
    address public immutable feeRecipient;
    address public immutable developer;
    address public constant swapRouter = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    address[] public vaults;

    constructor(address _admin, address _feeRecipient, address _developer) {
        admin = _admin;
        feeRecipient = _feeRecipient;
        developer = _developer;
    }

    function createVault(address beneficiary) external returns (address) {
        require(msg.sender == admin, "Only admin can call this");
        Vault vault = new Vault(admin, beneficiary, feeRecipient, developer, swapRouter);
        vaults.push(address(vault));
        return address(vault);
    }
}
