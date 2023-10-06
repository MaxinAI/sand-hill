import {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.21",
            },
        ]
    },
    networks: {
        hardhat: {
            forking: {
                url: "https://mainnet.infura.io/v3/3524ee82c6004aee98a63406525bdcb9",
                blockNumber: 18291895
            }
        }
    }
};

export default config;
