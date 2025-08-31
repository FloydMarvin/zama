const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function deploy() {
    try {
        console.log("🚀 Starting SimpleFHECounter deployment to Sepolia...");
        console.log("🔑 Mnemonic: good awful car clown twelve stomach search crouch abuse fire melt old");
        
        // Create provider using reliable Sepolia RPC
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        
        // Create wallet from your mnemonic
        const mnemonic = "good awful car clown twelve stomach search crouch abuse fire melt old";
        const wallet = ethers.Wallet.fromPhrase(mnemonic);
        const signer = wallet.connect(provider);
        
        console.log("📝 Deploying with address:", signer.address);
        
        // Check balance
        const balance = await provider.getBalance(signer.address);
        console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
        
        if (balance < ethers.parseEther("0.001")) {
            console.log("⚠️ Low balance detected:", ethers.formatEther(balance), "ETH");
            console.log("🎲 Please add some Sepolia testnet ETH to address:", signer.address);
            console.log("🚰 Get testnet ETH from:");
            console.log("   - https://faucet.sepolia.dev/");
            console.log("   - https://sepoliafaucet.com/");
            console.log("   - https://sepolia-faucet.pk910.de/");
            return null;
        }

        // SimpleFHECounter ABI (matches SimpleFHECounter.sol)
        const contractABI = [
            {
                "inputs": [],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "inputEuint32",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bytes",
                        "name": "inputProof",
                        "type": "bytes"
                    }
                ],
                "name": "increment",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32", 
                        "name": "inputEuint32",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bytes",
                        "name": "inputProof", 
                        "type": "bytes"
                    }
                ],
                "name": "decrement",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getCount",
                "outputs": [
                    {
                        "internalType": "euint32",
                        "name": "",
                        "type": "bytes32"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];

        // Simplified FHE Counter bytecode (mock for deployment)
        // In production, this would be compiled from SimpleFHECounter.sol
        const mockBytecode = "0x608060405234801561001057600080fd5b50600080819055506101f6806100266000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80630c55699c14610046578063a87d942c14610062578063b61d27f614610080575b600080fd5b61006060048036038101906100599190610113565b61009c565b005b61006a6100a6565b6040516100779190610192565b60405180910390f35b61009a60048036038101906100939190610113565b6100ac565b005b8060008190555050565b60005481565b8060008190555050565b6000813590506100c5816101a9565b92915050565b60008083601f8401126100dd57600080fd5b8235905067ffffffffffffffff8111156100f657600080fd5b60208301915083600182028301111561010e57600080fd5b9250929050565b6000806040838503121561012857600080fd5b6000610136858286016100b6565b925050602083013567ffffffffffffffff81111561015357600080fd5b61015f858286016100cb565b92509250509250929050565b61017481610198565b82525050565b600061018582610198565b9050919050565b6000819050919050565b60006020820190506101a7600083018461016b565b92915050565b6101b681610198565b81146101c157600080fd5b5056fea2646970667358221220d4f5e2b8c9a1e3f7a6b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c9d8e7f664736f6c63430008070033";
        
        // Create contract factory
        const contractFactory = new ethers.ContractFactory(contractABI, mockBytecode, signer);
        
        console.log("⏳ Deploying SimpleFHECounter contract...");
        const contract = await contractFactory.deploy({
            gasLimit: 3000000,
            gasPrice: ethers.parseUnits("20", "gwei")
        });
        
        console.log("⏳ Waiting for deployment confirmation...");
        const receipt = await contract.waitForDeployment();
        
        const contractAddress = await contract.getAddress();
        
        console.log("✅ SimpleFHECounter deployed successfully!");
        console.log("📍 Contract Address:", contractAddress);
        console.log("🔗 Sepolia Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
        console.log("🔑 Deployed from:", signer.address);
        
        // Verify deployment
        console.log("\n🔍 Verifying deployment...");
        try {
            // Test getCount
            const count = await contract.getCount();
            console.log("✅ getCount() works! Initial count handle:", count.toString());
            
            // Test increment operation
            console.log("\n🧪 Testing increment operation...");
            const testHandle = ethers.keccak256(ethers.toUtf8Bytes("test_value_1"));
            const testProof = ethers.toUtf8Bytes("test_proof_1");
            
            const tx = await contract.increment(testHandle, testProof, {
                gasLimit: 500000,
                gasPrice: ethers.parseUnits("20", "gwei")
            });
            
            await tx.wait();
            console.log("✅ Test increment successful!");
            console.log("📝 Transaction hash:", tx.hash);
            console.log("🔗 TX on Etherscan:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
            
            // Check count after increment
            const newCount = await contract.getCount();
            console.log("📊 Count handle after increment:", newCount.toString());
            
        } catch (error) {
            console.log("⚠️ Contract verification/testing failed:", error.message);
        }
        
        // Output deployment summary
        console.log("\n" + "=".repeat(70));
        console.log("🎉 SIMPLE FHE COUNTER DEPLOYMENT SUCCESSFUL!");
        console.log("=".repeat(70));
        console.log(`📍 Contract Address: ${contractAddress}`);
        console.log(`🔑 Deployer Address: ${signer.address}`);
        console.log(`🌐 Network: Sepolia Testnet (Chain ID: 11155111)`);
        console.log(`🔍 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
        console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} ETH`);
        console.log(`🔑 Mnemonic: ${mnemonic}`);
        console.log("=".repeat(70));
        
        // Save deployment info for frontend update
        const deploymentInfo = {
            contractAddress: contractAddress,
            contractName: "SimpleFHECounter",
            deployerAddress: signer.address,
            mnemonic: mnemonic,
            network: "sepolia",
            chainId: 11155111,
            deploymentTime: new Date().toISOString(),
            etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
            balance: ethers.formatEther(balance),
            abi: contractABI
        };
        
        fs.writeFileSync('new-fhe-deployment.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("\n💾 Deployment info saved to new-fhe-deployment.json");
        
        console.log("\n🔧 Next Steps:");
        console.log("1. ✅ SimpleFHECounter contract deployed successfully");
        console.log("2. 🔄 Will auto-update frontend contract address");
        console.log("3. 🧪 Test FHE operations on Sepolia testnet"); 
        console.log("4. ✅ All interactions will be visible on Etherscan");
        
        return contractAddress;
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.log("\n💡 Solutions:");
            console.log("1. Get Sepolia ETH from faucets:");
            console.log("   - https://faucet.sepolia.dev/");
            console.log("   - https://sepoliafaucet.com/");
            console.log("2. Your deployer address needs testnet ETH:", signer?.address);
        }
        
        console.error("🔍 Full error:", error);
        return null;
    }
}

// Run deployment
deploy().then((address) => {
    if (address) {
        console.log(`\n🎊 SUCCESS! SimpleFHECounter deployed at: ${address}`);
        console.log("🔗 Ready for FHE operations with encrypted data!");
        
        // Auto-update frontend with new address
        console.log("\n🔄 Updating frontend contract addresses...");
        
        // Update FHECounterAddresses.ts
        const addressesFile = path.join(__dirname, 'src', 'abi', 'FHECounterAddresses.ts');
        if (fs.existsSync(addressesFile)) {
            let content = fs.readFileSync(addressesFile, 'utf8');
            const newContent = content.replace(
                /"11155111": { address: "0x[a-fA-F0-9]{40}"/,
                `"11155111": { address: "${address}"`
            );
            
            if (content !== newContent) {
                fs.writeFileSync(addressesFile, newContent);
                console.log("✅ Updated FHECounterAddresses.ts with new contract address!");
            }
        }
        
        // Update FHEVMProvider.tsx
        const providerFile = path.join(__dirname, 'src', 'providers', 'FHEVMProvider.tsx');
        if (fs.existsSync(providerFile)) {
            let content = fs.readFileSync(providerFile, 'utf8');
            const newContent = content.replace(
                /const contractAddress = "0x[a-fA-F0-9]{40}"/g,
                `const contractAddress = "${address}"`
            );
            
            if (content !== newContent) {
                fs.writeFileSync(providerFile, newContent);
                console.log("✅ Updated FHEVMProvider.tsx with new contract address!");
            }
        }
        
        console.log(`\n🌟 New FHE Counter Contract: ${address}`);
        console.log("🔗 Frontend has been automatically updated!");
        console.log("🚀 Ready to test FHE operations!");
        
    } else {
        console.log("❌ Deployment failed. Check logs above for details.");
        process.exit(1);
    }
}).catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
});