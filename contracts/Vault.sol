// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}

contract Vault {
    ISwapRouter public immutable swapRouter;
    address public immutable admin;
    address public beneficiary;
    address public immutable feeRecipient;
    address public immutable developer;
    uint public immutable expiration;

    uint public stableSold;
    uint public stableBought;
    bool public sellingCrypto;
    bool public unlocked;

    address public constant SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;

    uint24 public constant FEE_TIER = 500;

    constructor(
        address _admin,
        address _beneficiary,
        address _feeRecipient,
        address _developer,
        uint _expiry
    ) {
        admin = _admin;
        beneficiary = _beneficiary;
        feeRecipient = _feeRecipient;
        developer = _developer;
        expiration = block.timestamp + _expiry;
    }

    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary, "Vault: Only beneficiary can call this");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Vault: Only admin can call this");
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
            uint developerFee = (fee * 20) / 100; // 20% from fee goes to developer
            uint fundFee = fee - developerFee; // 80% goes to fund address
            require(IERC20(USDC).transfer(feeRecipient, fundFee));
            require(IERC20(USDC).transfer(developer, developerFee));
        }
    }

    /// Admin operations

    function buy(uint _amount, uint _expectedMin, address _token) external onlyAdmin {
        require(!sellingCrypto, "Vault: You can only sell crypto currency");
        require(_token == WETH || _token == WBTC, "Vault: You can only buy WBTC or WETH");

        // Actual swap
        safeApprove(USDC, address(SWAP_ROUTER), _amount);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: USDC,
            tokenOut: _token,
            fee: FEE_TIER,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: _amount,
            amountOutMinimum: _expectedMin,
            sqrtPriceLimitX96: 0
        });
        ISwapRouter(SWAP_ROUTER).exactInputSingle(params);

        stableSold += _amount;
    }

    function sell(uint _amount, uint _expectedMin, address _token) external onlyAdmin {
        require(sellingCrypto, "Vault: Selling crypto currency is no enabled");
        require(_token == WETH || _token == WBTC, "Vault: Invalid token, you can only sell WBTC or WETH");

        safeApprove(_token, address(SWAP_ROUTER), _amount);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: _token,
            tokenOut: USDC,
            fee: FEE_TIER,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: _amount,
            amountOutMinimum: _expectedMin,
            sqrtPriceLimitX96: 0
        });
        uint amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(params);
        stableBought += amountOut;
    }

    function enableSell() external onlyAdmin {
        require(!sellingCrypto, "Vault: Selling crypto currency is already enabled");
        sellingCrypto = true;
    }


    function unlock() external onlyAdmin {
        require(!unlocked, "Vault: The vault is already unlocked");
        distributeFees();
        unlocked = true;
    }

    // Beneficiary operations

    function udateBeneficiary(address _beneficiary) external onlyBeneficiary {
        beneficiary = _beneficiary;
    }

    function transferOut(address _token) internal {
        IERC20 tokenContract = IERC20(_token);
        uint tokenBalance = tokenContract.balanceOf(address(this));
        if (tokenBalance > 0) {
            require(tokenContract.transfer(beneficiary, tokenBalance));
        }
    }

    function withdraw() external onlyBeneficiary {
        require(unlocked || block.timestamp >= expiration, "Vault: The vault is locked or not expired yet");
        if (!unlocked) {
            distributeFees();
            unlocked = true;
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

    address[] public vaults;

    constructor(address _admin, address _feeRecipient, address _developer) {
        admin = _admin;
        feeRecipient = _feeRecipient;
        developer = _developer;
    }

    function createVault(address beneficiary, uint expiry) external returns (address) {
        require(msg.sender == admin, "Only admin can call this");
        Vault vault = new Vault(admin, beneficiary, feeRecipient, developer, expiry);
        vaults.push(address(vault));
        return address(vault);
    }
}
