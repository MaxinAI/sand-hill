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
import hardhatConfig from "../hardhat.config";

const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");


describe("Vault Operations", function () {

    beforeEach(async function () {
        await helpers.reset(hardhatConfig.networks?.hardhat?.forking?.url, hardhatConfig.networks?.hardhat?.forking?.blockNumber);
    })

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

    it("Should generate profit and distribute fees", async () => {
        const {
            vault,
            vaultAddress,
            beneficiary,
            usdcBalance,
            admin,
            feeRecipient,
            other,
            developer
        } = await deployAndCreateVaultAndFill();
        const sharkBalance = ethers.parseEther("9000")
        await wrap(other, sharkBalance);
        await exchange(other, WETH, USDC, sharkBalance);

        const otherUsdcBalance = await USDC.balanceOf(other.address);
        await vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS);
        const stablesSold = await vault.stablesSold();
        await exchange(other, USDC, WETH, otherUsdcBalance);

        await vault.connect(admin).enableSell();

        const wethBalance = await WETH.balanceOf(vaultAddress);
        await vault.connect(admin).sell(wethBalance, 0n, WETH_ADDRESS);
        const stablesBought = await vault.stablesBought();

        expect(stablesBought - stablesSold).to.gt(5_000_000n); // We should get at least 5$ profit

        const profit = stablesBought - stablesSold;

        const fee = (profit * 20n) / 100n;

        const developerFee = (fee * 20n) / 100n;
        const fundFee = fee - developerFee;

        const developerBalanceBefore = await USDC.balanceOf(developer.address);
        const feeRecipientBalanceBefore = await USDC.balanceOf(feeRecipient.address);
        const beneficiaryBalanceBefore = await USDC.balanceOf(beneficiary.address);

        await vault.connect(admin).unlock();

        const developerBalanceAfter = await USDC.balanceOf(developer.address);
        const feeRecipientBalanceAfter = await USDC.balanceOf(feeRecipient.address);

        expect(developerBalanceAfter - developerBalanceBefore).to.eq(developerFee);
        expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.eq(fundFee);

        await vault.connect(beneficiary).withdraw();

        const beneficiaryBalanceAfter = await USDC.balanceOf(beneficiary.address);
        const beneficiaryProfit = profit - developerFee - fundFee;
        expect(beneficiaryBalanceAfter - beneficiaryBalanceBefore - usdcBalance).to.eq(beneficiaryProfit);
    });

    it("Should not distribute fees when there is no profit", async () => {
        const {
            vault,
            vaultAddress,
            beneficiary,
            usdcBalance,
            admin,
            developer,
            feeRecipient,
            other
        } = await deployAndCreateVaultAndFill();
        const sharkBalance = ethers.parseEther("9000")

        await vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS);
        const stablesSold = await vault.stablesSold();

        await vault.connect(admin).enableSell();

        await wrap(other, sharkBalance);
        await exchange(other, WETH, USDC, sharkBalance);

        const wethBalance = await WETH.balanceOf(vaultAddress);
        await vault.connect(admin).sell(wethBalance, 0n, WETH_ADDRESS);
        const stablesBought = await vault.stablesBought();

        expect(stablesSold - stablesBought).to.gt(5_000_000n); // We should get at least 5$ loss

        const developerBalanceBefore = await USDC.balanceOf(developer.address);
        const feeRecipientBalanceBefore = await USDC.balanceOf(feeRecipient.address);
        const vaultBalance = await USDC.balanceOf(vaultAddress);
        await vault.connect(admin).unlock()

        const developerBalanceAfter = await USDC.balanceOf(developer.address);
        const feeRecipientBalanceAfter = await USDC.balanceOf(feeRecipient.address);

        expect(developerBalanceAfter - developerBalanceBefore).to.eq(0);
        expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.eq(0);

        await vault.connect(beneficiary).withdraw();

        const beneficiaryBalance = await USDC.balanceOf(beneficiary.address);
        expect(vaultBalance).to.eq(beneficiaryBalance);
    });

    it("Should not be able to withdraw if not allowed", async () => {
        const {
            vault,
            admin,
        } = await deployAndCreateVaultAndFill();
        await expect(vault.connect(admin).withdraw()).to.revertedWith("Vault: Only beneficiary can call this");
    });

    it("Should be able to change beneficiary", async () => {
        const {
            vault,
            beneficiary,
            other
        } = await deployAndCreateVaultAndFill();
        await vault.connect(beneficiary).updateBeneficiary(other.address);
        expect(await vault.beneficiary()).to.eq(other.address);
    });

    it("Should not be able to change beneficiary if not allowed", async () => {
        const {
            vault,
            other
        } = await deployAndCreateVaultAndFill();
        await expect(vault.connect(other).updateBeneficiary(other.address)).to.revertedWith("Vault: Only beneficiary can call this")
    });

});
