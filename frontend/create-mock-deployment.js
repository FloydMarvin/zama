const { ethers } = require('ethers');

async function createMockDeployment() {
    const mnemonic = "depth bubble bulb earn maximum real wire crop pet volume time flame";
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    
    console.log("🔑 Mnemonic:", mnemonic);
    console.log("📍 Wallet Address:", wallet.address);
    
    // Create a deterministic contract address based on wallet and nonce
    const nonce = 0; // First deployment
    const contractAddress = ethers.getCreateAddress({
        from: wallet.address,
        nonce: nonce
    });
    
    console.log("📍 Predicted Contract Address:", contractAddress);
    console.log("🌐 Network: Sepolia Testnet");
    console.log("🔍 Etherscan URL:", `https://sepolia.etherscan.io/address/${contractAddress}`);
    
    // Create deployment info
    const deploymentInfo = {
        contractAddress: contractAddress,
        deployerAddress: wallet.address,
        mnemonic: mnemonic,
        network: "sepolia", 
        chainId: 11155111,
        deploymentTime: new Date().toISOString(),
        etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
        note: "Mock deployment - contract address generated deterministically",
        contractName: "FHE Privacy Counter",
        hasEncryptedOperations: true,
        canAmplify: true,
        canDampen: true,
        supportsDecryption: true
    };
    
    const fs = require('fs');
    fs.writeFileSync('mock-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📦 MOCK DEPLOYMENT CREATED");
    console.log("=".repeat(60));
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`🔑 Deployer: ${wallet.address}`);
    console.log(`🌐 Network: Sepolia`);
    console.log(`🔍 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log("=".repeat(60));
    
    return deploymentInfo;
}

createMockDeployment().then((info) => {
    console.log("\n✅ Mock deployment info created for frontend integration");
    console.log("🔧 Next: Update frontend contracts.ts with this address");
});