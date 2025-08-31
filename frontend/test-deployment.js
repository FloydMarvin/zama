const { ethers } = require('ethers');
const { FHECounterAddresses } = require('./src/abi/FHECounterAddresses');

async function testDeployment() {
    console.log('🔍 Testing deployment address configuration...\n');
    
    // Test Sepolia configuration
    const sepoliaConfig = FHECounterAddresses["11155111"];
    console.log('Sepolia Configuration:');
    console.log('  Address:', sepoliaConfig?.address);
    console.log('  Chain ID:', sepoliaConfig?.chainId);
    console.log('  Chain Name:', sepoliaConfig?.chainName);
    console.log('  Is Zero Address:', sepoliaConfig?.address === ethers.ZeroAddress);
    console.log('  Is Valid Address:', ethers.isAddress(sepoliaConfig?.address || ''));
    
    console.log('\n');
    
    // Test Hardhat configuration
    const hardhatConfig = FHECounterAddresses["31337"];
    console.log('Hardhat Configuration:');
    console.log('  Address:', hardhatConfig?.address);
    console.log('  Chain ID:', hardhatConfig?.chainId);
    console.log('  Chain Name:', hardhatConfig?.chainName);
    console.log('  Is Zero Address:', hardhatConfig?.address === ethers.ZeroAddress);
    console.log('  Is Valid Address:', ethers.isAddress(hardhatConfig?.address || ''));
    
    console.log('\n');
    
    // Test provider connectivity (if available)
    try {
        if (typeof window !== 'undefined' && window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();
            console.log('Current Network:');
            console.log('  Chain ID:', Number(network.chainId));
            console.log('  Name:', network.name);
            
            const configForCurrent = FHECounterAddresses[Number(network.chainId).toString()];
            console.log('  Has Config:', !!configForCurrent);
            if (configForCurrent) {
                console.log('  Contract Address:', configForCurrent.address);
            }
        }
    } catch (error) {
        console.log('Provider test failed:', error.message);
    }
    
    console.log('\n✅ Deployment test completed');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testDeployment };
} else {
    testDeployment();
}