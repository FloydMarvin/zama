const { ethers } = require('ethers');

async function getContractInfo() {
    try {
        // Sepolia provider
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        
        // 现有的成功FHEVM合约地址
        const contractAddress = "0x4D55AAD4bf74E3167D75ACB21aD9343c46779393";
        
        console.log("🔍 Analyzing existing FHEVM contract:", contractAddress);
        
        // 获取合约字节码
        const bytecode = await provider.getCode(contractAddress);
        console.log("📋 Bytecode length:", bytecode.length);
        console.log("💾 Bytecode (first 100 chars):", bytecode.substring(0, 100) + "...");
        
        // 获取合约创建信息
        const balance = await provider.getBalance(contractAddress);
        console.log("💰 Contract balance:", ethers.formatEther(balance), "ETH");
        
        // 测试一些基本调用
        console.log("\n🧪 Testing contract methods...");
        
        // 尝试调用 getCount (这应该返回一个 handle)
        try {
            const getCountSelector = "0xa87d942c"; // getCount()
            const result = await provider.call({
                to: contractAddress,
                data: getCountSelector
            });
            console.log("✅ getCount() call result:", result);
        } catch (error) {
            console.log("⚠️ getCount() failed:", error.message);
        }
        
        // 获取交易历史以了解合约的使用模式
        console.log("\n📊 This contract seems to be working with FHEVM operations");
        console.log("🎯 We can use this as a reference for deployment");
        
        return {
            address: contractAddress,
            bytecode: bytecode,
            isWorking: bytecode.length > 2 // 如果字节码长度大于2，说明有实际代码
        };
        
    } catch (error) {
        console.error("❌ Error analyzing contract:", error.message);
        return null;
    }
}

getContractInfo().then((info) => {
    if (info && info.isWorking) {
        console.log("\n✅ Contract analysis successful!");
        console.log("📍 Address:", info.address);
        console.log("💾 Has valid bytecode:", info.isWorking);
        console.log("\n💡 Recommendation: Use this working contract or deploy similar bytecode");
    } else {
        console.log("❌ Contract analysis failed");
    }
}).catch(console.error);