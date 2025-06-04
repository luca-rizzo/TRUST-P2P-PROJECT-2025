import groupManagerAbi from '../../../../hardhat/artifacts/contracts/TrustGroupManager.sol/TrustGroupManager.json';
import trustTokenAbi from '../../../../hardhat/artifacts/contracts/TrustToken.sol/TrustToken.json';

export const GROUP_MANAGER_CONTRACT = {
    publicAddress: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
    abi: groupManagerAbi.abi
}

export const TRUST_TOKEN_CONTRACT = {
    publicAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    abi: trustTokenAbi.abi
}