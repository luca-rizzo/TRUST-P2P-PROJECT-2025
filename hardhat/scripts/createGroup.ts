import hre from "hardhat";

async function main() {
    const contractAddress = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
    const groupManager = await hre.ethers.getContractAt("TrustGroupManager", contractAddress);
    const [Alice, Bob, Charlie, Dixie] = await hre.ethers.getSigners();

    await groupManager.connect(Alice).createGroup('Pisa home', [Bob, Charlie]);
    
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});