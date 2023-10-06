import helpers, {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers} from "hardhat";
import {expect} from "chai";
import {deployVault, deployVaultManager, getSigners} from "./common";
import hardhatConfig from "../hardhat.config";


describe("Deployment", function () {

    beforeEach(async function () {
        await helpers.reset(hardhatConfig.networks?.hardhat?.forking?.url, hardhatConfig.networks?.hardhat?.forking?.blockNumber);
    })

    describe("Deploy Vault", function () {
        it("Should be deployed", async function () {
            const {vault} = await deployVault();
            await vault.waitForDeployment();
            const vaultAddress = await vault.getAddress()

            expect(vaultAddress).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Deploy Vault Manager", function () {
        it("Should be deployed", async function () {
            const {vaultManager, admin} = await deployVaultManager();
            await vaultManager.waitForDeployment();
            const vaultManagerAddress = await vaultManager.getAddress()

            expect(vaultManagerAddress).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Create Vault", function () {
        it("Should be able to create vault", async () => {
            const {vaultManager, admin, beneficiary} = await deployVaultManager();
            await vaultManager.waitForDeployment();

            await vaultManager.connect(admin).createVault(beneficiary.address, 1000n);
            const vaultAddress = await vaultManager.vaults(0);

            expect(vaultAddress).to.not.equal(ethers.ZeroAddress);
        });

        it("Should throw error if non-admin creates Vault", async () => {
            const {vaultManager, other, beneficiary} = await deployVaultManager();
            await vaultManager.waitForDeployment();

            await expect(vaultManager.connect(other).createVault(beneficiary.address, 1000n)).to.revertedWith("VaultManager: Only admin can create Vault");
        });

        it("Should be able to create several vaults", async () => {
            const {vaultManager, admin, beneficiary} = await deployVaultManager();
            await vaultManager.waitForDeployment();

            await vaultManager.connect(admin).createVault(beneficiary.address, 1000n);
            await vaultManager.connect(admin).createVault(beneficiary.address, 1000n);

            const vaultAddress = await vaultManager.vaults(0);
            const vault2Address = await vaultManager.vaults(1);
            expect(vaultAddress).to.not.equal(ethers.ZeroAddress);
            expect(vault2Address).to.not.equal(vaultAddress);
            expect(vault2Address).to.not.equal(ethers.ZeroAddress);
        });
    })
});
