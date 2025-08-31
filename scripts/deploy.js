const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting FHEVM Counter deployment...");
    
    // Get the contract factory
    const FHEVMCounter = await ethers.getContractFactory("FHEVMCounter");
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const balance = await ethers.provider.getBalance(deployerAddress);
    
    console.log("📝 Deploying with account:", deployerAddress);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
    
    if (balance < ethers.parseEther("0.001")) {
        console.log("⚠️ Low balance detected. Please add testnet ETH.");
        console.log("🚰 Get Sepolia ETH from: https://faucet.sepolia.dev/");
        return;
    }
    
    console.log("⏳ Deploying FHEVMCounter contract...");
    
    // Deploy the contract
    const counter = await FHEVMCounter.deploy({
        gasLimit: 3000000,
    });
    
    // Wait for deployment
    await counter.waitForDeployment();
    const contractAddress = await counter.getAddress();
    
    console.log("✅ FHEVMCounter deployed successfully!");
    console.log("📍 Contract Address:", contractAddress);
    console.log("🔑 Owner Address:", deployerAddress);
    console.log("🌐 Network:", hre.network.name);
    console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    try {
        // Test getStatus
        const status = await counter.getStatus();
        console.log("✅ getStatus() works! Status:", status.toString());
        
        // Test getCount  
        const countHandle = await counter.getCount();
        console.log("✅ getCount() works! Handle:", countHandle.toString());
        
    } catch (error) {
        console.log("⚠️ Contract verification failed:", error.message);
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("🎉 FHEVM COUNTER DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(70));
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`🔑 Owner: ${deployerAddress}`);
    console.log(`🌐 Network: ${hre.network.name} (Chain ID: ${hre.network.config.chainId})`);
    console.log(`🔍 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log("=".repeat(70));
    
    // Save deployment info
    const deploymentInfo = {
        contractAddress: contractAddress,
        contractName: "FHEVMCounter",
        deployerAddress: deployerAddress,
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deploymentTime: new Date().toISOString(),
        etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
        balance: ethers.formatEther(balance)
    };
    
    const fs = require('fs');
    fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to deployment-info.json");
    
    return contractAddress;
}

// Execute deployment
main()
    .then((address) => {
        if (address) {
            console.log(`\n🎊 SUCCESS! FHEVM Counter deployed at: ${address}`);
            process.exit(0);
        }
    })
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });