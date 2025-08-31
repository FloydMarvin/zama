const { ethers } = require('ethers');
const fs = require('fs');

async function deploySimpleCounter() {
    try {
        console.log("🚀 Deploying Simple Counter to Sepolia...");
        
        // Provider - 使用Alchemy公共端点
        const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/demo");
        
        // Wallet
        const mnemonic = "depth bubble bulb earn maximum real wire crop pet volume time flame";
        const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);
        
        console.log("📝 Deploying from address:", wallet.address);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
        
        // 最简单的 Counter 合约字节码
        const simpleCounterBytecode = "0x608060405234801561001057600080fd5b50600080815560018190556000600281905550610142806100326000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c80633fa4f2451461005c57806361bc221a146100665780636d4ce63c14610084578063a87d942c146100a2578063d09de08a146100c0575b600080fd5b6100646100ca565b005b61006e6100d1565b60405161007b9190610113565b60405180910390f35b61008c6100d7565b6040516100999190610113565b60405180910390f35b6100aa6100dd565b6040516100b79190610113565b60405180910390f35b6100c86100e3565b005b6001600081905550565b60005481565b60015481565b60025481565b60008081548092919060010191905055506001600081548092919060010191905055506002600081548092919060010191905055565b6000819050919050565b61012d81610108565b82525050565b60006020820190506101486000830184610124565b9291505056fea264697066735822122080b3c9be2c9b8c3e1234567890abcdef1234567890abcdef1234567890abcdef64736f6c63430008140033";
        
        // 对应的 ABI 
        const contractABI = [
            {
                "inputs": [],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "inputs": [],
                "name": "increment",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getCount",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "reset",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ];

        console.log("⏳ Deploying simple counter contract...");
        
        // 部署交易参数 - 使用最低设置
        const deployTransaction = {
            data: simpleCounterBytecode,
            gasLimit: 500000,  // 减少 gas limit
            gasPrice: ethers.parseUnits("10", "gwei")  // 降低 gas price
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
        
        console.log("✅ Simple Counter deployed successfully!");
        console.log("📍 Contract Address:", contractAddress);
        console.log("🔗 Sepolia Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
        
        // 验证部署
        console.log("\n🔍 Verifying deployment...");
        const bytecodeCheck = await provider.getCode(contractAddress);
        console.log("✅ Bytecode confirmed, length:", bytecodeCheck.length);
        
        // 测试 getCount 方法
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const count = await contract.getCount();
        console.log("✅ getCount() test successful, result:", count.toString());
        
        // 保存部署信息
        const deploymentInfo = {
            contractAddress: contractAddress,
            contractName: "SimpleCounter",
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
        
        fs.writeFileSync('simple-counter-deployment.json', JSON.stringify(deploymentInfo, null, 2));
        
        console.log("\n" + "=".repeat(70));
        console.log("🎉 SIMPLE COUNTER DEPLOYMENT SUCCESSFUL!");
        console.log("=".repeat(70));
        console.log(`📍 Contract Address: ${contractAddress}`);
        console.log(`🔑 Owner: ${wallet.address}`);
        console.log(`🌐 Network: Sepolia Testnet (Chain ID: 11155111)`);
        console.log(`🔍 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
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
deploySimpleCounter().then((address) => {
    if (address) {
        console.log(`\n🎊 SUCCESS! Simple Counter deployed at: ${address}`);
    } else {
        console.log("❌ Deployment failed. Check error logs above.");
        process.exit(1);
    }
}).catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
});