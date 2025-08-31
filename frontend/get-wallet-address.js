const { ethers } = require('ethers');

async function getWalletAddress() {
    const mnemonic = "depth bubble bulb earn maximum real wire crop pet volume time flame";
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    
    console.log("🔑 Mnemonic:", mnemonic);
    console.log("📍 Wallet Address:", wallet.address);
    console.log("🔐 Private Key:", wallet.privateKey);
    
    return wallet.address;
}

getWalletAddress();