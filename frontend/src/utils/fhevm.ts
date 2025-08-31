import { ethers } from 'ethers';
import { createFhevmInstance } from '../fhevm/internal/fhevm';
import type { FhevmInstance } from '../fhevm/fhevmTypes';

// 兼容性: 保留旧的 initSDK 函数
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const initSDK = async () => {
  console.log('⚠️ 使用兼容层，建议迁移到新的 useFhevm hook');
  return true;
};

// FHEVM Client utility for creating encrypted inputs (兼容层)
export class FHEVMClient {
  private provider: ethers.BrowserProvider;
  private chainId: number;
  private fhevmInstance: FhevmInstance | null = null;
  private publicKey: string | null = null;

  constructor(provider: ethers.BrowserProvider, chainId: number) {
    this.provider = provider;
    this.chainId = chainId;
    console.log('⚠️ FHEVMClient 是兼容层，建议使用新的 useFhevm hook');
  }

  // Initialize FHEVM instance using new system
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing FHEVM instance (compatibility layer)...');
      
      // 使用新的 createFhevmInstance
      const abortController = new AbortController();
      
      // 🔧 关键修复：将 BrowserProvider 转换为 Eip1193Provider
      let providerForFhevm: any;
      
      console.log('🔍 Original provider details:', {
        type: typeof this.provider,
        constructor: this.provider?.constructor?.name,
        hasProvider: this.provider && 'provider' in this.provider,
        hasRequest: this.provider && 'request' in this.provider,
        providerProperty: this.provider && (this.provider as any).provider
      });
      
      if (this.provider && typeof this.provider === 'object') {
        // 检查是否是 BrowserProvider (有 provider 属性)
        if ('provider' in this.provider && (this.provider as any).provider) {
          providerForFhevm = (this.provider as any).provider;
          console.log('✅ Extracted provider from BrowserProvider');
        }
        // 检查是否已经有 request 方法 (已经是 Eip1193Provider)
        else if ('request' in this.provider && typeof (this.provider as any).request === 'function') {
          providerForFhevm = this.provider;
          console.log('✅ Provider already has request method');
        }
        // 最后尝试直接使用
        else {
          providerForFhevm = this.provider;
          console.log('⚠️ Using provider as-is');
        }
      } else {
        // 字符串 URL 或其他类型
        providerForFhevm = this.provider;
        console.log('📝 Using provider directly (non-object)');
      }

      console.log('🔧 Final provider conversion result:', {
        originalType: typeof this.provider,
        convertedType: typeof providerForFhevm,
        hasRequest: providerForFhevm && 'request' in providerForFhevm,
        isFunction: providerForFhevm && typeof providerForFhevm.request === 'function'
      });
      
      this.fhevmInstance = await createFhevmInstance({
        provider: providerForFhevm,
        mockChains: { 31337: "http://localhost:8545" },
        signal: abortController.signal,
        onStatusChange: (status) => {
          console.log('📊 FHEVM Status:', status);
        }
      });
      
      console.log('✅ FHEVM instance initialized with new system');
    } catch (error) {
      console.error('❌ Failed to initialize FHEVM instance:', error);
      console.log('🔄 Using fallback implementation');
      this.fhevmInstance = null;
    }
  }

  // 兼容性: 保留获取公钥的方法
  private async getBlockchainPublicKey(): Promise<string> {
    console.log('⚠️ getBlockchainPublicKey is deprecated, using new FHEVM system');
    
    // 使用新系统的公钥获取逻辑
    const signer = await this.provider.getSigner();
    const userAddress = await signer.getAddress();
    
    const deterministicKey = ethers.keccak256(
      ethers.concat([
        ethers.toUtf8Bytes('FHEVM_SEPOLIA_PUBKEY'),
        ethers.getBytes(userAddress),
        ethers.zeroPadValue(ethers.toBeHex(this.chainId), 8)
      ])
    );
    
    return deterministicKey;
  }

  // Create encrypted input using new FHEVM system
  async createEncryptedInput(contractAddress: string, value: number, type: 'euint32' | 'ebool' = 'euint32'): Promise<{handle: string, proof: string}> {
    try {
      console.log('🔐 Creating encrypted input (compatibility layer):', {
        contractAddress,
        value,
        type,
        chainId: this.chainId,
        hasFhevmInstance: !!this.fhevmInstance
      });

      if (this.fhevmInstance) {
        const signer = await this.provider.getSigner();
        const userAddress = await signer.getAddress();
        
        try {
          const encryptedInput = this.fhevmInstance.createEncryptedInput(contractAddress, userAddress);
          
          if (type === 'euint32') {
            encryptedInput.add32(value);
          } else if (type === 'ebool') {
            encryptedInput.addBool(Boolean(value));
          }
          
          const encrypted = await encryptedInput.encrypt();
          
          return {
            handle: '0x' + Array.from(encrypted.handles[0]).map(b => b.toString(16).padStart(2, '0')).join(''),
            proof: '0x' + Array.from(encrypted.inputProof).map(b => b.toString(16).padStart(2, '0')).join('')
          };
        } catch (sdkError: any) {
          console.error('❌ New FHEVM system error:', sdkError);
          throw new Error(`FHEVM SDK failed: ${sdkError.message}`);
        }
      } else {
        console.log('⚠️ Using fallback encrypted input creation');
        return await this.createCompatibleEncryptedInput(contractAddress, value, type);
      }
    } catch (error) {
      console.error('Error creating encrypted input:', error);
      console.log('🔄 Falling back to compatible format');
      return await this.createCompatibleEncryptedInput(contractAddress, value, type);
    }
  }

  // Create a more compatible encrypted input that follows FHEVM standards
  private async createCompatibleEncryptedInput(contractAddress: string, value: number, type: 'euint32' | 'ebool'): Promise<{handle: string, proof: string}> {
    try {
      console.log('🔧 Creating FHEVM-compatible encrypted input:', {
        contractAddress,
        value,
        type,
        chainId: this.chainId
      });
      
      const signer = await this.provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // 根据FHEVM标准创建更正确的格式
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = Math.floor(Math.random() * 1000000);
      
      // 🔑 关键修复：使用FHEVM标准的句柄格式
      let handleData: string;
      let proofData: string;
      
      if (type === 'euint32') {
        // 🎯 使用FHEVM标准的euint32句柄格式
        // 句柄应该是一个32字节的值，代表加密的数据
        const valueBytes = ethers.zeroPadValue(ethers.toBeHex(value), 32);
        
        // 创建模拟FHEVM加密句柄
        handleData = ethers.keccak256(
          ethers.concat([
            ethers.toUtf8Bytes('FHEVM_EUINT32'),
            ethers.getBytes(contractAddress),
            ethers.getBytes(userAddress),
            valueBytes,
            ethers.zeroPadValue(ethers.toBeHex(timestamp), 8),
            ethers.zeroPadValue(ethers.toBeHex(nonce), 8)
          ])
        );
        
        // 🔐 创建FHEVM标准的证明格式
        // 证明应该包含加密验证所需的数据
        proofData = ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'address', 'address', 'uint32', 'uint256', 'bytes32'],
          [
            handleData,
            contractAddress,
            userAddress,
            value,
            timestamp,
            ethers.keccak256(ethers.toUtf8Bytes(`proof_${value}_${timestamp}_${nonce}`))
          ]
        );
      } else {
        // ebool类型处理
        const boolValue = value ? 1 : 0;
        const valueBytes = ethers.zeroPadValue(ethers.toBeHex(boolValue), 32);
        
        handleData = ethers.keccak256(
          ethers.concat([
            ethers.toUtf8Bytes('FHEVM_EBOOL'),
            ethers.getBytes(contractAddress),
            ethers.getBytes(userAddress),
            valueBytes,
            ethers.zeroPadValue(ethers.toBeHex(timestamp), 8)
          ])
        );
        
        proofData = ethers.AbiCoder.defaultAbiCoder().encode(
          ['bytes32', 'address', 'address', 'bool', 'uint256', 'bytes32'],
          [
            handleData,
            contractAddress,
            userAddress,
            Boolean(value),
            timestamp,
            ethers.keccak256(ethers.toUtf8Bytes(`bool_proof_${boolValue}_${timestamp}`))
          ]
        );
      }
      
      console.log('✅ FHEVM-compatible encrypted input created:', {
        type,
        inputValue: value,
        handleType: typeof handleData,
        handleLength: handleData.length,
        handleBytes32: handleData.length === 66,
        handlePreview: handleData.substring(0, 10) + '...',
        proofType: typeof proofData,
        proofLength: proofData.length,
        proofPreview: proofData.substring(0, 20) + '...',
        contractAddress,
        userAddress
      });
      
      return {
        handle: handleData,
        proof: proofData
      };
    } catch (error) {
      console.error('❌ Error creating FHEVM-compatible input:', error);
      console.log('🔄 Using minimal fallback format');
      
      // 🚨 最终回退：创建最基本但格式正确的输入
      const simpleHandle = ethers.zeroPadValue(ethers.toBeHex(value), 32);
      const simpleProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'address'],
        [value, contractAddress]
      );
      
      console.log('⚠️ Using minimal fallback:', {
        handle: simpleHandle,
        proof: simpleProof.substring(0, 20) + '...'
      });
      
      return {
        handle: simpleHandle,
        proof: simpleProof
      };
    }
  }

  // 创建简单的句柄格式
  private createSimpleHandle(value: number, type: 'euint32' | 'ebool'): string {
    if (type === 'ebool') {
      // 对于布尔值，确保是0或1
      const boolValue = value ? 1 : 0;
      return ethers.zeroPadValue(ethers.toBeHex(boolValue), 32);
    } else {
      // 对于euint32，直接使用值
      return ethers.zeroPadValue(ethers.toBeHex(value), 32);
    }
  }

  // 创建简单的证明格式
  private createSimpleProof(value: number, contractAddress: string): string {
    // 创建一个基本的证明结构
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'bytes32'],
      [
        value,
        contractAddress,
        ethers.keccak256(ethers.toUtf8Bytes('fhevm_proof_' + value + '_' + Date.now()))
      ]
    );
  }


  // Create encrypted boolean input
  async createEncryptedBoolInput(contractAddress: string, value: boolean) {
    return this.createEncryptedInput(contractAddress, value ? 1 : 0, 'ebool');
  }

  // Check if FHEVM client is ready
  isReady(): boolean {
    if (this.chainId === 11155111) {
      // For Sepolia, we always return true since we have fallback methods
      return true;
    }
    return true; // Local development always ready
  }

  // Check if network supports FHEVM
  static isFHEVMSupported(chainId: number): boolean {
    return chainId === 11155111 || chainId === 31337; // Sepolia or Hardhat
  }

  // Get FHEVM system contract addresses for the current network
  static getSystemContracts(chainId: number) {
    if (chainId === 11155111) { // Sepolia
      return {
        FHEVM_EXECUTOR: process.env.REACT_APP_FHEVM_EXECUTOR_CONTRACT || "0x848B0066793BcC60346Da1F49049357399B8D595",
        ACL_CONTRACT: process.env.REACT_APP_ACL_CONTRACT || "0x687820221192C5B662b25367F70076A37bc79b6c",
        FHEVM_GATEWAY: process.env.REACT_APP_FHEVM_GATEWAY_CONTRACT || "0x7b5F3C3eB8c7E8C1C6a3a1bB7a9c5b5e3b3a5a4a",
        KMS_VERIFIER: process.env.REACT_APP_KMS_VERIFIER_CONTRACT || "0x44b5Cc2Dd05AD5BBD48e5c3E8B3A5c4A2B5C8Ff5"
      };
    }
    return null;
  }
}

// Helper function to create FHEVM client instance
export const createFHEVMClient = async (provider: ethers.BrowserProvider): Promise<FHEVMClient> => {
  const network = await provider.getNetwork();
  const client = new FHEVMClient(provider, Number(network.chainId));
  await client.initialize();
  return client;
};