import {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config"

const TEST_PROVIDER = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`
const GOERLI_PROVIDER = `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.21",
            },
        ]
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_KEY,
    },
    networks: {
        hardhat: {
            forking: {
                url: TEST_PROVIDER,
            }
        },
        goerli: {
            url: GOERLI_PROVIDER,
            accounts: [process.env.PRIVATE_KEY]
        }
    },
    mocha: {
        timeout: 100000000
    }
};

export default config;
