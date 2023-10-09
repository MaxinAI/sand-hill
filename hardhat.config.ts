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
                url: "https://goerli.infura.io/v3/3524ee82c6004aee98a63406525bdcb9",
            }
        }
    }
};

export default config;
