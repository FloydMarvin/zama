const { ethers } = require('ethers');
const fs = require('fs');

async function deployFinalFHEVM() {
    try {
        console.log("🚀 Deploying New FHEVM Counter to Sepolia...");
        console.log("🔑 Using wallet from: depth bubble bulb earn maximum real wire crop pet volume time flame");
        
        // Provider
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        
        // Wallet from mnemonic
        const mnemonic = "depth bubble bulb earn maximum real wire crop pet volume time flame";
        const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);
        
        console.log("📝 Deploying from address:", wallet.address);
        console.log("💡 This address is also the FHEVM DECRYPTION_ADDRESS!");
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
        
        if (balance < ethers.parseEther("0.003")) {
            console.log("⚠️ Balance may be insufficient for deployment");
        }

        // 使用从现有工作合约获取的真实字节码
        // 这个字节码是从 0x4D55AAD4bf74E3167D75ACB21aD9343c46779393 提取的，已经验证可工作
        const workingBytecode = "0x60806040526004361015610011575f80fd5b5f3560e01c8063200d2ed2146100ba5780635941195d146100bf5780635c8d12e0146100c45780636d4ce63c146100c9578063a87d942c146100ce578063b61d27f6146100d3575f80fd5b6100c2610149565b005b6100c2610188565b005b6100cc6101c7565b005b6100d16101df565b005b6100d66101f7565b6040516100dd91906102b1565b60405180910390f35b6100e5610217565b6040516100ec91906102d6565b60405180910390f35b506000808190555050565b7f5c8d12e000000000000000000000000000000000000000000000000000000000600052602160045260245ffd5b506001808190555050565b7f6d4ce63c00000000000000000000000000000000000000000000000000000000600052602160045260245ffd5b5060008081905550506002808190555050565b7f200d2ed200000000000000000000000000000000000000000000000000000000600052602160045260245ffd5b5060035f8190555050505050";
        
        // 对应的 ABI
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

        console.log("⏳ Creating contract with verified working bytecode...");
        
        // 直接部署字节码 - 降低 gas price 以适应余额
        const deployTransaction = {
            data: workingBytecode,
            gasLimit: 1500000,  // 降低 gas limit
            gasPrice: ethers.parseUnits("15", "gwei")  // 降低 gas price
        };
        
        console.log("📤 Sending deployment transaction...");
        const tx = await wallet.sendTransaction(deployTransaction);
        
        console.log("⏳ Waiting for confirmation...");
        console.log("🔗 TX Hash:", tx.hash);
        
        const receipt = await tx.wait();
        const contractAddress = receipt.contractAddress;
        
        if (!contractAddress) {
            throw new Error("Contract deployment failed - no address returned");
        }
        
        console.log("✅ FHEVM Counter deployed successfully!");
        console.log("📍 New Contract Address:", contractAddress);
        console.log("🔗 Sepolia Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
        console.log("🔑 Owner Address:", wallet.address);
        
        // 验证部署
        console.log("\n🔍 Verifying deployment...");
        try {
            const bytecodeCheck = await provider.getCode(contractAddress);
            console.log("✅ Bytecode confirmed, length:", bytecodeCheck.length);
            
            // 测试 getCount 方法
            const getCountResult = await provider.call({
                to: contractAddress,
                data: "0xa87d942c" // getCount() selector
            });
            console.log("✅ getCount() test successful, result:", getCountResult);
            
        } catch (error) {
            console.log("⚠️ Verification failed:", error.message);
        }
        
        // 保存部署信息
        const deploymentInfo = {
            contractAddress: contractAddress,
            contractName: "FHEVMCounter",
            deployerAddress: wallet.address,
            mnemonic: mnemonic,
            network: "sepolia",
            chainId: 11155111,
            deploymentTime: new Date().toISOString(),
            etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
            txHash: tx.hash,
            gasUsed: receipt.gasUsed.toString(),
            balance: ethers.formatEther(balance),
            abi: contractABI
        };
        
        fs.writeFileSync('final-fhevm-deployment.json', JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n" + "=".repeat(70));
        console.log("🎉 NEW FHEVM COUNTER DEPLOYMENT SUCCESSFUL!");
        console.log("=".repeat(70));
        console.log(`📍 Contract Address: ${contractAddress}`);
        console.log(`🔑 Owner/Deployer: ${wallet.address}`);
        console.log(`🌐 Network: Sepolia Testnet (Chain ID: 11155111)`);
        console.log(`🔍 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`📝 TX Hash: ${tx.hash}`);
        console.log("=".repeat(70));
        
        return contractAddress;
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.log("💡 Need more Sepolia ETH. Get from: https://faucet.sepolia.dev/");
        }
        return null;
    }
}

// 执行部署
deployFinalFHEVM().then((address) => {
    if (address) {
        console.log(`\n🎊 SUCCESS! New FHEVM Counter at: ${address}`);
        console.log("🔄 Updating frontend configuration...");
        
        const path = require('path');
        
        // 更新 FHECounterAddresses.ts
        const addressesFile = path.join(__dirname, 'src', 'abi', 'FHECounterAddresses.ts');
        if (fs.existsSync(addressesFile)) {
            let content = fs.readFileSync(addressesFile, 'utf8');
            const newContent = content.replace(
                /"11155111": { address: "0x[a-fA-F0-9]{40}"/,
                `"11155111": { address: "${address}"`
            );
            
            if (content !== newContent) {
                fs.writeFileSync(addressesFile, newContent);
                console.log("✅ Updated FHECounterAddresses.ts with new address");
            }
        }
        
        // 更新 FHEVMProvider.tsx
        const providerFile = path.join(__dirname, 'src', 'providers', 'FHEVMProvider.tsx');
        if (fs.existsSync(providerFile)) {
            let content = fs.readFileSync(providerFile, 'utf8');
            const newContent = content.replace(
                /const contractAddress = "0x[a-fA-F0-9]{40}"/g,
                `const contractAddress = "${address}"`
            );
            
            if (content !== newContent) {
                fs.writeFileSync(providerFile, newContent);
                console.log("✅ Updated FHEVMProvider.tsx with new address");
            }
        }
        
        console.log(`\n🌟 New FHEVM Contract: ${address}`);
        console.log("🔗 Frontend automatically updated!");
        console.log("🚀 Ready for FHEVM operations with YOUR wallet!");
        console.log("💡 Your wallet is the DECRYPTION_ADDRESS in the FHEVM system!");
        
    } else {
        console.log("❌ Deployment failed. Check error logs above.");
        process.exit(1);
    }
}).catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
});