// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@fhevm/solidity/contracts/FHE.sol";

/**
 * @title Simple FHE Counter
 * @dev Simple encrypted counter contract for basic FHE operations
 */
contract SimpleFHECounter {
    using FHE for euint32;
    
    // Encrypted counter value
    euint32 private count;
    
    constructor() {
        // Initialize counter to 0
        count = FHE.asEuint32(0);
    }
    
    /**
     * @dev Increment the counter by an encrypted value
     * @param inputEuint32 The encrypted value to add
     * @param inputProof The proof for the encrypted input
     */
    function increment(bytes32 inputEuint32, bytes calldata inputProof) external {
        euint32 value = FHE.asEuint32(inputEuint32, inputProof);
        count = count.add(value);
    }
    
    /**
     * @dev Decrement the counter by an encrypted value
     * @param inputEuint32 The encrypted value to subtract
     * @param inputProof The proof for the encrypted input
     */
    function decrement(bytes32 inputEuint32, bytes calldata inputProof) external {
        euint32 value = FHE.asEuint32(inputEuint32, inputProof);
        count = count.sub(value);
    }
    
    /**
     * @dev Get the current encrypted counter value
     * @return The encrypted counter value
     */
    function getCount() external view returns (euint32) {
        return count;
    }
}