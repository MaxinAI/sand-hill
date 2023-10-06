import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers} from "hardhat";
import {expect} from "chai";
import {deployAndCreateVault, deployVaultManager, exchange, getSigners, USDC, WETH, WETH_ADDRESS, wrap} from "./common";
import * as assert from "assert";


describe("Vault Operations", function () {

    it("Should be able to withdraw", async function () {

        const {vault, admin, beneficiary} = await deployAndCreateVault;
        const vaultAddress = await vault.getAddress();
        expect(vaultAddress).to.not.equal(ethers.ZeroAddress);

        // Wrap ETH
        const amount = ethers.parseEther("1");
        await wrap(beneficiary, amount);
        expect(await WETH.balanceOf(beneficiary.address)).to.equal(amount);

        const usdcBalance = await USDC.balanceOf(beneficiary.address);
        expect(usdcBalance).to.equal(0n);

        // Convert to USDC
        await exchange(beneficiary, WETH, USDC, amount);

        const finalUsdcBalance = await USDC.balanceOf(beneficiary.address);
        expect(finalUsdcBalance).to.gt(0n);

        await USDC.connect(beneficiary).transfer(vaultAddress, finalUsdcBalance);

        const vaultUsdcBalance = await USDC.balanceOf(vaultAddress);
        expect(vaultUsdcBalance).to.eq(finalUsdcBalance);

        const vaultEthBalance = await WETH.balanceOf(vaultAddress);
        expect(vaultEthBalance).to.eq(0n);

        await vault.connect(admin).buy(vaultUsdcBalance, 0n, WETH_ADDRESS)

        const finalVaultEthBalance = await WETH.balanceOf(vaultAddress);
        expect(finalVaultEthBalance).to.gt(0n);

        await vault.connect(admin).enableSell();

        await vault.connect(admin).sell(finalVaultEthBalance, 0n, WETH_ADDRESS)

        const veryFinalUsdcBalance = await USDC.balanceOf(vaultAddress);
        expect(veryFinalUsdcBalance).to.gt(0n);

        await vault.connect(admin).unlock()

        const beneficiaryUsdcBalance = await USDC.balanceOf(beneficiary.address);
        await vault.connect(beneficiary).withdraw();
        const veryVeryFinalUsdcBalance = await USDC.balanceOf(beneficiary.address);
        expect(veryVeryFinalUsdcBalance).to.gt(beneficiaryUsdcBalance);
    });

    it("Should not be able to withdraw w/o unlock and before expiration", async function () {

    });

    it("Should be able to withdraw w/o unlock but after expiration", async function () {
        assert.fail("Not implemented");
    });

    it("Should calculate profit", async () => {
        assert.fail("Not implemented");
    });

    it("Should distribute fees when there is profit", async () => {
        assert.fail("Not implemented");
    });

    it("Should not distribute fees when there is no profit", async () => {
        assert.fail("Not implemented");
    });
});
