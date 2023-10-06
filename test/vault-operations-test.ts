import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers} from "hardhat";
import {expect} from "chai";
import {deployVaultManager, exchange, getSigners, USDC, WETH, WETH_ADDRESS} from "./common";


describe("Vault Deposit, Trade, Withdraw", function () {

    it("Should be able to deposit, trade and withdraw", async function () {

        const {vaultManager, admin} = await loadFixture(deployVaultManager);
        await vaultManager.waitForDeployment();
        const {beneficiary} = await getSigners();

        await vaultManager.connect(admin).createVault(beneficiary.address, 1000n);

        const vaultAddress = await vaultManager.vaults(0);
        expect(vaultAddress).to.not.equal(ethers.ZeroAddress);

        const vault = await ethers.getContractAt("Vault", vaultAddress);

        // Wrap ETH
        const amount = ethers.parseEther("1");
        await WETH.connect(beneficiary).deposit({value: amount});
        expect(await WETH.balanceOf(beneficiary.address)).to.be.equal(amount);


        const usdcBalance = await USDC.balanceOf(beneficiary.address);
        expect(usdcBalance).to.be.equal(0n);

        // Convert to USDC
        await exchange(beneficiary, WETH, USDC, amount);

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
