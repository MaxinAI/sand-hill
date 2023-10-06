import {ethers} from "hardhat";

export const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export const WETH = new ethers.Contract(
    WETH_ADDRESS,
    [
        "function deposit() payable",
        "function balanceOf(address) view returns (uint)",
        "function transfer(address, uint) returns (bool)",
        "function approve(address, uint) returns (bool)"
    ],
    ethers.provider,
)

export const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export const USDC = new ethers.Contract(
    USDC_ADDRESS,
    [
        "function balanceOf(address) view returns (uint)",
        "function transfer(address, uint) returns (bool)"
    ],
    ethers.provider,
)

export const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
export const SWAP_ROUTER = new ethers.Contract(
    SWAP_ROUTER_ADDRESS,
    [
        "function exactInputSingle(tuple(address,address,uint24,address,uint,uint,uint,uint160)) payable returns (uint)"
    ],
    ethers.provider,
)


export async function getSigners() {
    const [deployer, admin, beneficiary, feeRecipient, developer, other] = await ethers.getSigners();
    return {deployer, admin, beneficiary, feeRecipient, developer, other};
}

export async function deployVault() {
    const [deployer, admin, beneficiary, feeRecipient, developer, other] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
        admin.address,
        beneficiary.address,
        feeRecipient.address,
        developer.address,
        1000n,
    );
    return {vault, deployer, admin, beneficiary, feeRecipient, developer, other};
}

export async function deployVaultManager() {
    const [deployer, admin, beneficiary, feeRecipient, developer, other] = await ethers.getSigners();
    const VaultManager = await ethers.getContractFactory("VaultManager");
    const vaultManager = await VaultManager.deploy(
        admin.address,
        feeRecipient.address,
        developer.address,
    );
    return {vaultManager, deployer, admin, beneficiary, feeRecipient, developer, other};
}