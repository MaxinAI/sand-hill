import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers} from "hardhat";
import {expect} from "chai";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const WETH = new ethers.Contract(
    WETH_ADDRESS,
    [
        "function deposit() payable",
        "function balanceOf(address) view returns (uint)",
        "function transfer(address, uint) returns (bool)",
        "function approve(address, uint) returns (bool)"
    ],
    ethers.provider,
)

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC = new ethers.Contract(
    USDC_ADDRESS,
    [
        "function balanceOf(address) view returns (uint)",
        "function transfer(address, uint) returns (bool)"
    ],
    ethers.provider,
)

const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const SWAP_ROUTER = new ethers.Contract(
    SWAP_ROUTER_ADDRESS,
    [
        "function exactInputSingle(tuple(address,address,uint24,address,uint,uint,uint,uint160)) payable returns (uint)"
    ],
    ethers.provider,
)

describe("Vault", function () {
    async function getSigners() {
        const [deployer, admin, beneficiary, feeRecipient, developer, other] = await ethers.getSigners();
        return {deployer, admin, beneficiary};
    }

    async function deployVault() {
        const [deployer, admin, beneficiary, feeRecipient, developer] = await ethers.getSigners();
        const Vault = await ethers.getContractFactory("Vault");
        const vault = await Vault.deploy(
            admin.address,
            beneficiary.address,
            feeRecipient.address,
            developer.address,
            SWAP_ROUTER,
        );
        return {vault, deployer, admin, beneficiary};
    }

    async function deployVaultManager() {
        const [deployer, admin, feeRecipient] = await ethers.getSigners();
        const VaultManager = await ethers.getContractFactory("VaultManager");
        const vaultManager = await VaultManager.deploy(
            admin.address,
            feeRecipient.address,
        );
        return {vaultManager, deployer, admin};
    }

    describe("Deploy Vault", function () {
        it("Should be deployed", async function () {
            const {vault} = await loadFixture(deployVault);
            await vault.waitForDeployment();
        });
    });

    describe("Deploy Vault Manager", function () {
        it("Should be deployed", async function () {
            const {vaultManager, admin} = await loadFixture(deployVaultManager);
            await vaultManager.waitForDeployment();
            const {beneficiary} = await getSigners();

            await vaultManager.connect(admin).createVault(beneficiary.address);

            const vaultAddress = await vaultManager.vaults(0);
            expect(vaultAddress).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Deposit", function () {
        it("Should be able to deposit", async function () {
            const {vault, beneficiary, admin} = await loadFixture(deployVault);
            await vault.waitForDeployment();
            const vaultAddress = await vault.getAddress();

            // Wrap ETH
            const amount = ethers.parseEther("1");
            await WETH.connect(beneficiary).deposit({value: amount});
            expect(await WETH.balanceOf(beneficiary.address)).to.be.equal(amount);


            const usdcBalance = await USDC.balanceOf(beneficiary.address);
            expect(usdcBalance).to.be.equal(0n);

            // Convert to USDC
            await WETH.connect(beneficiary).approve(SWAP_ROUTER_ADDRESS, amount);
            await SWAP_ROUTER.connect(beneficiary).exactInputSingle([
                WETH_ADDRESS,
                USDC_ADDRESS,
                500n,
                beneficiary.address,
                ethers.MaxUint256,
                amount,
                0n,
                0n,
            ])

            const finalUsdcBalance = await USDC.balanceOf(beneficiary.address);
            expect(finalUsdcBalance).to.be.gt(0n);

            await USDC.connect(beneficiary).transfer(vaultAddress, finalUsdcBalance);

            const vaultUsdcBalance = await USDC.balanceOf(vaultAddress);
            expect(vaultUsdcBalance).to.be.eq(finalUsdcBalance);

            const vaultEthBalance = await WETH.balanceOf(vaultAddress);
            expect(vaultEthBalance).to.be.eq(0n);

            await vault.connect(admin).buy(vaultUsdcBalance, 0n, WETH_ADDRESS)

            const finalVaultEthBalance = await WETH.balanceOf(vaultAddress);
            expect(finalVaultEthBalance).to.be.gt(0n);

            await vault.connect(admin).sellCrypto();

            await vault.connect(admin).sell(finalVaultEthBalance, 0n, WETH_ADDRESS)

            const veryFinalUsdcBalance = await USDC.balanceOf(vaultAddress);
            expect(veryFinalUsdcBalance).to.be.gt(0n);

            await vault.connect(admin).unlock()


            const beneficiaryUsdcBalance = await USDC.balanceOf(beneficiary.address);
            await vault.connect(beneficiary).withdraw();
            const veryVeryFinalUsdcBalance = await USDC.balanceOf(beneficiary.address);
            expect(veryVeryFinalUsdcBalance).to.be.gt(beneficiaryUsdcBalance);


        });
    });

});
