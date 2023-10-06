import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {ethers} from "hardhat";
import {expect} from "chai";
import {deployVault, deployVaultManager, getSigners} from "./common";
import assert from "assert";


describe("Vault Administration", function () {

    describe("Do exchange", function () {
        it("Should be able to buy crypto", async () => {

        });

        it("Should not be able to buy crypto if sell enabled", async () => {
            assert.fail("Not implemented");
        });

        it("Should be able to sell crypto", async () => {
            assert.fail("Not implemented");
        });

        it("Should not be able to sell crypto if sell not enabled", async () => {
            assert.fail("Not implemented");
        });

        it("Should be able to unlock", async () => {
            assert.fail("Not implemented");
        });

        it("Should not be able to withdraw w/o unlock", async () => {
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
});
