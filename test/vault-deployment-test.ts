import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers} from "hardhat";
import {expect} from "chai";
import {deployVault, deployVaultManager, getSigners} from "./common";


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
});
