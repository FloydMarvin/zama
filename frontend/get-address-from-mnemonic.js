const { ethers } = require('ethers');

async function getAddress() {
    const mnemonic = "depth bubble bulb earn maximum real wire crop pet volume time flame";
    
    console.log("🔑 Mnemonic:", mnemonic);
    
    // Create wallet from mnemonic
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    
    console.log("📍 Address:", wallet.address);
    console.log("🔐 Private Key:", wallet.privateKey);
    
    // Check balance on Sepolia
    try {
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        const balance = await provider.getBalance(wallet.address);
        console.log("💰 Sepolia Balance:", ethers.formatEther(balance), "ETH");
    } catch (error) {
        console.log("⚠️ Could not check balance:", error.message);
    }
}

getAddress().catch(console.error);