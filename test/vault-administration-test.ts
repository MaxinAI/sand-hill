import {expect} from "chai";
import {deployAndCreateVaultAndFill, USDC, USDC_ADDRESS, WETH, WETH_ADDRESS} from "./common";


describe("Vault Administration", function () {

    describe("Do exchange", function () {
        it("Should be able to buy crypto", async () => {
            const {vault, admin, usdcBalance, vaultAddress} = await deployAndCreateVaultAndFill();
            await vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS)
            expect(await WETH.balanceOf(vaultAddress)).to.be.gt(0n);
        });

        it("Should not be able to buy crypto if sell enabled", async () => {
            const {vault, admin, usdcBalance} = await deployAndCreateVaultAndFill();
            await vault.connect(admin).enableSell();
            await expect(vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS)).to.revertedWith("Vault: You can only sell crypto currency")
        });

        it("Should not be able to buy crypto if other than WTBC or WETH", async () => {
            const {vault, admin, usdcBalance} = await deployAndCreateVaultAndFill();
            await expect(vault.connect(admin).buy(usdcBalance, 0n, USDC_ADDRESS)).to.revertedWith("Vault: You can only buy WBTC or WETH")
        });

        it("Should not be able to buy crypto if not admin", async () => {
            const {vault, other, admin, usdcBalance} = await deployAndCreateVaultAndFill();
            await expect(vault.connect(other).buy(usdcBalance, 0n, WETH_ADDRESS)).to.revertedWith("Vault: Only admin can call this")
        });

        it("Should be able to sell crypto", async () => {
            const {vault, admin, usdcBalance, vaultAddress} = await deployAndCreateVaultAndFill();

            await vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS)

            const ethBalanceBefore = await WETH.balanceOf(vaultAddress);
            expect(ethBalanceBefore).to.be.gt(0n);

            const usdcBalanceBefore = await USDC.balanceOf(vaultAddress);
            expect(usdcBalanceBefore).to.be.eq(0n);

            await vault.connect(admin).enableSell();

            await vault.connect(admin).sell(ethBalanceBefore, 0n, WETH_ADDRESS)

            const usdcBalanceAfter = await USDC.balanceOf(vaultAddress);
            expect(usdcBalanceAfter).to.be.gt(0n);

            const ethBalanceAfter = await WETH.balanceOf(vaultAddress);
            expect(ethBalanceAfter).to.be.eq(0n);
        });

        it("Should not be able to sell crypto if sell not enabled", async () => {
            const {vault, admin, usdcBalance, vaultAddress} = await deployAndCreateVaultAndFill();

            await vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS)
            const ethBalanceBefore = await WETH.balanceOf(vaultAddress);

            await expect(vault.connect(admin).sell(ethBalanceBefore, 0n, WETH_ADDRESS)).to.revertedWith("Vault: Selling crypto currency is not enabled")
        });

        it("Should not be able to sell crypto if other than WTBC or WETH", async () => {
            const {vault, vaultAddress, admin, usdcBalance} = await deployAndCreateVaultAndFill();

            await vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS)
            const ethBalanceBefore = await WETH.balanceOf(vaultAddress);

            await vault.connect(admin).enableSell();

            await expect(vault.connect(admin).sell(ethBalanceBefore, 0n, USDC_ADDRESS)).to.revertedWith("Vault: Invalid token, you can only sell WBTC or WETH")
        });

        it("Should not be able to sell crypto if not admin", async () => {
            const {vault, vaultAddress, other, admin, usdcBalance} = await deployAndCreateVaultAndFill();

            await vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS)
            const ethBalanceBefore = await WETH.balanceOf(vaultAddress);

            await expect(vault.connect(other).sell(ethBalanceBefore, 0n, WETH_ADDRESS)).to.revertedWith("Vault: Only admin can call this")

        });

        it("Should not be able to enable sell if not admin", async () => {
            const {vault, admin, other, usdcBalance} = await deployAndCreateVaultAndFill();

            await vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS)

            await expect(vault.connect(other).enableSell()).to.revertedWith("Vault: Only admin can call this");
        })

        it("Should not be able to enable sell if already enabled", async () => {
            const {vault, vaultAddress, admin, usdcBalance} = await deployAndCreateVaultAndFill();

            await vault.connect(admin).buy(usdcBalance, 0n, WETH_ADDRESS)
            await vault.connect(admin).enableSell()
            await expect(vault.connect(admin).enableSell()).to.revertedWith("Vault: Selling crypto currency is already enabled");
        })

        it("Should be able to unlock", async () => {
            const {vault, admin} = await deployAndCreateVaultAndFill();
            await vault.connect(admin).unlock();
        });

        it("Should not be able to unlock if admin", async () => {
            const {vault, other, vaultAddress} = await deployAndCreateVaultAndFill();
            await expect(vault.connect(other).unlock()).to.revertedWith("Vault: Only admin can call this");
        });

        it("Should not be able to unlock if already unlocked", async () => {
            const {vault, admin} = await deployAndCreateVaultAndFill();
            await vault.connect(admin).unlock();
            await expect(vault.connect(admin).unlock()).to.revertedWith("Vault: The vault is already unlocked");
        });

    });
});
