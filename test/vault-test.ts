import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers} from "hardhat";
import {expect} from "chai";
import {
    deployVault,
    deployVaultManager,
    getSigners,
    SWAP_ROUTER,
    SWAP_ROUTER_ADDRESS,
    USDC, USDC_ADDRESS,
    WETH,
    WETH_ADDRESS
} from "./common";


describe("Vault", function () {


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

            await vaultManager.connect(admin).createVault(beneficiary.address, 1000n);

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

            await vault.connect(admin).enableSell();

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
