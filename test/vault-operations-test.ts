import {ethers, network} from "hardhat";
import {expect} from "chai";
import {
    deployAndCreateVault,
    deployAndCreateVaultAndFill,
    exchange,
    USDC,
    WBTC,
    WETH,
    WETH_ADDRESS,
    wrap
} from "./common";
import * as assert from "assert";


describe("Vault Operations", function () {

    it("Should be able to withdraw", async function () {

        const {vault, admin, beneficiary} = await deployAndCreateVault();
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

    it("Should be able to withdraw all tokens", async function () {
        const {vault, vaultAddress, admin, beneficiary, other} = await deployAndCreateVault();
        await wrap(other, ethers.parseEther("3"));
        await exchange(other, WETH, USDC, ethers.parseEther("1"));
        await exchange(other, WETH, WBTC, ethers.parseEther("1"));

        const vaultWethBalance = await WETH.balanceOf(other);
        const vaultUsdcBalance = await USDC.balanceOf(other);
        const vaultWbtcBalance = await WBTC.balanceOf(other);

        const startWethBalance = await WETH.balanceOf(beneficiary);
        const startUsdcBalance = await USDC.balanceOf(beneficiary);
        const startWbtcBalance = await WBTC.balanceOf(beneficiary);

        expect(vaultWethBalance).to.gt(0n);
        expect(vaultUsdcBalance).to.gt(0n);
        expect(vaultWbtcBalance).to.gt(0n);

        await WETH.connect(other).transfer(vaultAddress, vaultWethBalance);
        await USDC.connect(other).transfer(vaultAddress, vaultUsdcBalance);
        await WBTC.connect(other).transfer(vaultAddress, vaultWbtcBalance);

        await vault.connect(admin).unlock();

        await vault.connect(beneficiary).withdraw();

        const beneficiaryWethBalance = await WETH.balanceOf(beneficiary.address);
        const beneficiaryUsdcBalance = await USDC.balanceOf(beneficiary.address);
        const beneficiaryWbtcBalance = await WBTC.balanceOf(beneficiary.address);

        expect(beneficiaryWethBalance - startWethBalance).to.eq(vaultWethBalance);
        expect(beneficiaryUsdcBalance - startUsdcBalance).to.eq(vaultUsdcBalance);
        expect(beneficiaryWbtcBalance - startWbtcBalance).to.eq(vaultWbtcBalance);
    });


    it("Should not be able to withdraw w/o unlock and before expiration", async function () {
        const {vault, beneficiary} = await deployAndCreateVaultAndFill();
        await expect(vault.connect(beneficiary).withdraw()).to.be.revertedWith("Vault: The vault is locked or not expired yet");
    });

    it("Should be able to withdraw w/o unlock after expiration", async function () {
        const {vault, beneficiary} = await deployAndCreateVaultAndFill();
        await network.provider.send("evm_increaseTime", [10000]);
        await vault.connect(beneficiary).withdraw()
    });

    it("Should calculate profit", async () => {
        assert.fail("Not implemented");
    });

    it("Should distribute fees if there is profit", async () => {
        assert.fail("Not implemented");
    });

    it("Should not distribute fees when there is no profit", async () => {
        assert.fail("Not implemented");
    });
});
