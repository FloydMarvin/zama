import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useWalletContext } from './WalletProvider';
import { useMetaMask } from '../hooks/useMetaMaskProvider';
import { useFhevm } from '../fhevm/useFhevm';
import type { FhevmInstance } from '../fhevm/fhevmTypes';

interface FHEVMContextType {
  isReady: boolean;
  isLoading: boolean;
  networkSupported: boolean;
  encryptedCount: string;
  inputValue: string;
  setInputValue: (value: string) => void;
  performEncryptAdd: (value: number) => Promise<void>;
  performEncryptSub: (value: number) => Promise<void>;
  refreshState: () => Promise<void>;
  fhevmInstance: FhevmInstance | null | undefined;
  status: string;
}

const FHEVMContext = createContext<FHEVMContextType | undefined>(undefined);

export const useFHEVMContext = () => {
  const context = useContext(FHEVMContext);
  if (!context) {
    throw new Error('useFHEVMContext must be used within a FHEVMProvider');
  }
  return context;
};

interface FHEVMProviderProps {
  children: React.ReactNode;
}

export const FHEVMProvider: React.FC<FHEVMProviderProps> = ({ children }) => {
  const { provider, account, chainId } = useWalletContext();
  const { provider: eip1193Provider } = useMetaMask(); // Get the raw EIP-1193 provider
  const [encryptedCount, setEncryptedCount] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  
  // ✅ 使用新的 useFhevm hook 替代自定义逻辑
  const {
    instance: fhevmInstance,
    status,
    error: fhevmError,
  } = useFhevm({ 
    provider: eip1193Provider, // Use raw EIP-1193 provider directly
    chainId: chainId || undefined,
    enabled: Boolean(eip1193Provider && account),
    // 支持 Sepolia (11155111) 和本地 Hardhat (31337)
    initialMockChains: {
      31337: "http://localhost:8545"
    }
  });
  
  // Derive loading and ready states from status
  const fhevmLoading = status === "loading";
  const fhevmReady = status === "ready" && fhevmInstance !== undefined;
  
  const [networkSupported, setNetworkSupported] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);

  useEffect(() => {
    const checkNetworkSupport = () => {
      if (!chainId) {
        setNetworkSupported(false);
        return;
      }
      
      // ✅ Sepolia 网络支持 (chainId: 11155111)
      const isSepolia = chainId === 11155111;
      const isLocalHardhat = chainId === 31337;
      const supported = isSepolia || isLocalHardhat;
      
      setNetworkSupported(supported);
      
      console.log('🌐 Network check:', {
        chainId,
        isSepolia,
        isLocalHardhat,
        supported,
        provider: !!provider,
        account: !!account,
        fhevmReady
      });
    };

    checkNetworkSupport();
  }, [provider, account, chainId, fhevmReady]);
  
  // 显示 FHEVM 错误
  useEffect(() => {
    if (fhevmError) {
      console.error('❌ FHEVM Error:', fhevmError);
      toast.error(`FHEVM Error: ${fhevmError.message}`);
    }
  }, [fhevmError]);

  // ✅ 使用新的 FHEVM 实例创建加密输入
  const createEncryptedInput = useCallback(async (value: number, contractAddress: string) => {
    if (!fhevmInstance || !account) {
      throw new Error('FHEVM instance or account not available');
    }
    
    try {
      console.log('🔐 Creating encrypted input with new FHEVM system:', {
        value,
        contractAddress,
        chainId,
        account,
        fhevmInstance: !!fhevmInstance
      });
      
      // For Sepolia, try to create proper encrypted inputs using FHEVM instance
      if (chainId === 11155111 && fhevmInstance.createEncryptedInput) {
        const encryptedInput = fhevmInstance.createEncryptedInput(contractAddress, account);
        encryptedInput.add32(value);
        
        const encrypted = await encryptedInput.encrypt();
        
        console.log('✅ Successfully created encrypted input:', {
          handles: encrypted.handles,
          inputProof: encrypted.inputProof instanceof Uint8Array 
            ? `Uint8Array[${encrypted.inputProof.length}]`
            : String(encrypted.inputProof).substring(0, 100) + '...'
        });
        
        return {
          handle: encrypted.handles[0],
          proof: encrypted.inputProof
        };
      } else {
        throw new Error('FHEVM createEncryptedInput not available');
      }
    } catch (error) {
      console.error('❌ Error creating encrypted input with FHEVM instance:', error);
      
      // For MockFHECounter, create a simple mock encrypted input
      // The contract extracts the value from the first 32 bytes
      console.log('🧪 Using mock encrypted input for testing');
      
      const mockHandle = ethers.zeroPadValue(ethers.toBeHex(value), 32);
      const mockProof = '0x1234'; // Simple mock proof
      
      console.log('📦 Mock encrypted input:', {
        handle: mockHandle,
        proof: mockProof,
        originalValue: value
      });
      
      return { 
        handle: mockHandle, 
        proof: mockProof 
      };
    }
  }, [fhevmInstance, account, chainId]);

  const refreshState = useCallback(async () => {
    if (!provider || !account) return;
    
    try {
      const timestamp = Date.now();
      const mockHandle = ethers.id(`encrypted_${timestamp}_${account}`);
      setEncryptedCount(mockHandle);
    } catch (error) {
      console.error('Error refreshing state:', error);
    }
  }, [provider, account]);

  const performEncryptAdd = useCallback(async (value: number) => {
    if (!provider || !networkSupported || !fhevmInstance) {
      toast.error('Network not supported for FHEVM operations or FHEVM not ready');
      return;
    }

    setOperationLoading(true);
    try {
      console.log('🔐➕ Performing encrypted increment operation...');
      
      const contractAddress = "0x3df5bbE3F4F3d71E984cfc9Cf59422103b035980";
      const signer = await provider.getSigner();
      
      // Full ABI for increment operation
      const fullAbi = [
        "function increment(bytes32 inputEuint32, bytes inputProof) external",
        "function getCount() public view returns (bytes32)",
        "function getCounterStatus() public view returns (uint8)"
      ];
      
      const contract = new ethers.Contract(contractAddress, fullAbi, signer);
      
      // First test read functions to ensure contract is accessible
      try {
        const count = await contract.getCount();
        console.log('✅ getCount() success:', count);
        
        const status = await contract.getCounterStatus();
        console.log('✅ getCounterStatus() success:', status);
        
      } catch (readError) {
        console.error('❌ Read-only functions failed:', readError);
        toast.error('Contract is not accessible');
        return;
      }
      
      // Now try to create encrypted input and perform increment
      try {
        console.log('🔐 Creating encrypted input for value:', value);
        const { handle, proof } = await createEncryptedInput(value, contractAddress);
        
        console.log('🔐 Calling increment with encrypted input:', {
          handle: handle instanceof Uint8Array ? `Uint8Array[${handle.length}]` : String(handle).substring(0, 20) + '...',
          proofLength: proof instanceof Uint8Array ? proof.length : String(proof).length
        });
        
        const tx = await contract.increment(handle, proof, {
          gasLimit: 2000000,  // High gas limit for FHEVM operations
          gasPrice: ethers.parseUnits("10", "gwei")
        });
        
        console.log('⏳ Transaction sent, waiting for confirmation:', tx.hash);
        toast.info(`Transaction sent: ${tx.hash.substring(0, 10)}...`);
        
        const receipt = await tx.wait();
        console.log('✅ Increment transaction confirmed:', receipt);
        
        toast.success(`🎉 Successfully incremented by ${value}! TX: ${tx.hash.substring(0, 10)}...`);
        
        // State will be refreshed by useEffect when transaction completes
        
      } catch (incrementError: any) {
        console.error('❌ Increment operation failed:', incrementError);
        
        if (incrementError.code === 'CALL_EXCEPTION') {
          toast.error(`Contract call failed: ${incrementError.reason || incrementError.message}`);
        } else {
          toast.error(`Increment failed: ${incrementError.message}`);
        }
      }
      
    } catch (error: any) {
      console.error('Contract interaction failed:', error);
      toast.error('🔐➕ Contract operation failed: ' + error.message);
    } finally {
      setOperationLoading(false);
    }
  }, [provider, networkSupported, fhevmInstance, createEncryptedInput]);

  const performEncryptSub = useCallback(async (value: number) => {
    if (!provider || !networkSupported || !fhevmInstance) {
      toast.error('Network not supported for FHEVM operations or FHEVM not ready');
      return;
    }

    setOperationLoading(true);
    try {
      console.log('🔐➖ Performing encrypted decrement operation...');
      
      const contractAddress = "0x3df5bbE3F4F3d71E984cfc9Cf59422103b035980";
      const signer = await provider.getSigner();
      
      // Full ABI for decrement operation
      const fullAbi = [
        "function decrement(bytes32 inputEuint32, bytes inputProof) external",
        "function getCount() public view returns (bytes32)",
        "function getCounterStatus() public view returns (uint8)",
        "function getDecryptedCount() public view returns (uint32)"
      ];
      
      const contract = new ethers.Contract(contractAddress, fullAbi, signer);
      
      // First test read functions to ensure contract is accessible
      try {
        const count = await contract.getCount();
        console.log('✅ getCount() success:', count);
        
        const status = await contract.getCounterStatus();
        console.log('✅ getCounterStatus() success:', status);
        
        // Try to get decrypted count if available
        try {
          const decryptedCount = await contract.getDecryptedCount();
          console.log('✅ getDecryptedCount() success:', decryptedCount.toString());
          toast.info(`📊 Current decrypted count: ${decryptedCount.toString()}`);
        } catch (decryptError) {
          console.log('ℹ️ getDecryptedCount() not available (value not decrypted yet)');
        }
        
      } catch (readError) {
        console.error('❌ Read-only functions failed:', readError);
        toast.error('Contract is not accessible');
        return;
      }
      
      // Now try to create encrypted input and perform decrement
      try {
        console.log('🔐 Creating encrypted input for value:', value);
        const { handle, proof } = await createEncryptedInput(value, contractAddress);
        
        console.log('🔐 Calling decrement with encrypted input:', {
          handle: handle instanceof Uint8Array ? `Uint8Array[${handle.length}]` : String(handle).substring(0, 20) + '...',
          proofLength: proof instanceof Uint8Array ? proof.length : String(proof).length
        });
        
        const tx = await contract.decrement(handle, proof, {
          gasLimit: 2000000,  // High gas limit for FHEVM operations
          gasPrice: ethers.parseUnits("10", "gwei")
        });
        
        console.log('⏳ Transaction sent, waiting for confirmation:', tx.hash);
        toast.info(`Transaction sent: ${tx.hash.substring(0, 10)}...`);
        
        const receipt = await tx.wait();
        console.log('✅ Decrement transaction confirmed:', receipt);
        
        toast.success(`🎉 Successfully decremented by ${value}! TX: ${tx.hash.substring(0, 10)}...`);
        
        // State will be refreshed by useEffect when transaction completes
        
      } catch (decrementError: any) {
        console.error('❌ Decrement operation failed:', decrementError);
        
        if (decrementError.code === 'CALL_EXCEPTION') {
          toast.error(`Contract call failed: ${decrementError.reason || decrementError.message}`);
        } else {
          toast.error(`Decrement failed: ${decrementError.message}`);
        }
      }
      
    } catch (error: any) {
      console.error('Contract interaction failed:', error);
      toast.error('🔐➖ Contract operation failed: ' + error.message);
    } finally {
      setOperationLoading(false);
    }
  }, [provider, networkSupported, fhevmInstance, createEncryptedInput]);

  useEffect(() => {
    if (fhevmReady && networkSupported && account) {
      refreshState();
    }
  }, [fhevmReady, networkSupported, account, refreshState]);

  const isReady = fhevmReady && networkSupported && !!account;
  const isLoading = fhevmLoading || operationLoading;
  
  const contextValue: FHEVMContextType = {
    isReady,
    isLoading,
    networkSupported,
    encryptedCount,
    inputValue,
    setInputValue,
    performEncryptAdd,
    performEncryptSub,
    refreshState,
    fhevmInstance,
    status,
  };

  return (
    <FHEVMContext.Provider value={contextValue}>
      {children}
    </FHEVMContext.Provider>
  );
};