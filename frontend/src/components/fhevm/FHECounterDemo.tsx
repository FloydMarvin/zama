import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useFhevm } from '../../fhevm/useFhevm';
import { useWalletContext } from '../../providers/WalletProvider';
import { useMetaMask } from '../../hooks/useMetaMaskProvider';
import { getFHECounterByChainId, FHECounterInfoType } from '../../utils/contracts';
import { FhevmDecryptionSignature } from '../../fhevm/FhevmDecryptionSignature';
import { GenericStringInMemoryStorage } from '../../fhevm/GenericStringStorage';
import './FHECounterDemo.css';

const FHECounterDemo: React.FC = () => {
  const { provider: ethersProvider, account, chainId, isConnected, connectWallet } = useWalletContext();
  const { provider: eip1193Provider } = useMetaMask();
  
  // Network switching function
  const switchToSepolia = useCallback(async () => {
    if (!eip1193Provider) return;
    
    try {
      await eip1193Provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await eip1193Provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia test network',
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
        }
      } else {
        console.error('Failed to switch to Sepolia:', error);
      }
    }
  }, [eip1193Provider]);
  const [countHandle, setCountHandle] = useState<string | undefined>(undefined);
  const [clearCount, setClearCount] = useState<bigint | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const [isDecrementing, setIsDecrementing] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [message, setMessage] = useState<string>('Ready for FHE operations');
  
  // Initialize signature storage (using in-memory storage for demo)
  const signatureStorage = useMemo(() => new GenericStringInMemoryStorage(), []);
  
  // Get FHE counter contract info using template pattern
  const fheCounter: FHECounterInfoType = useMemo(() => getFHECounterByChainId(chainId || undefined), [chainId]);

  // Get FHEVM instance - must use EIP-1193 provider, not ethers.BrowserProvider
  const { 
    instance: fhevmInstance, 
    status: fhevmStatus,
    error: fhevmError 
  } = useFhevm({
    provider: eip1193Provider,
    chainId: chainId || undefined,
    enabled: Boolean(eip1193Provider && isConnected),
    initialMockChains: {
      31337: "http://localhost:8545"
    }
  });

  // Derive loading state from status  
  const isLoading = fhevmStatus === "loading";

  // Check if contract is deployed (using template pattern)
  const isDeployed = useMemo(() => {
    if (!fheCounter.address || fheCounter.address === ethers.ZeroAddress) {
      return false;
    }
    
    // Basic address format validation
    if (!ethers.isAddress(fheCounter.address)) {
      console.error('Invalid contract address format:', fheCounter.address);
      return false;
    }
    
    return true;
  }, [fheCounter.address]);

  // Check if we can perform operations
  const canRefresh = useMemo(() => {
    return isDeployed && !isRefreshing;
  }, [isDeployed, isRefreshing]);

  const canOperate = useMemo(() => {
    return isDeployed && fhevmInstance && ethersProvider && !isLoading && !isRefreshing && !isIncrementing && !isDecrementing && !isDecrypting;
  }, [isDeployed, fhevmInstance, ethersProvider, isLoading, isRefreshing, isIncrementing, isDecrementing, isDecrypting]);

  // Load count handle from contract
  const refreshCountHandle = useCallback(async () => {
    if (!canRefresh || !fheCounter.address) return;
    
    setIsRefreshing(true);
    setMessage('Loading encrypted count...');
    
    try {
      console.log('🔍 Attempting to connect to contract:', {
        address: fheCounter.address,
        chainId: chainId,
        provider: !!ethersProvider
      });

      let provider: ethers.BrowserProvider | ethers.JsonRpcProvider = ethersProvider!;
      let bytecode: string;
      
      // First try with MetaMask provider
      if (ethersProvider) {
        try {
          bytecode = await ethersProvider.getCode(fheCounter.address);
          console.log('📋 MetaMask provider - Contract bytecode length:', bytecode.length);
        } catch (error) {
          console.log('⚠️ MetaMask provider failed, trying fallback RPC...');
          bytecode = '0x';
        }
      } else {
        bytecode = '0x';
      }
      
      // If MetaMask provider fails or returns empty bytecode, use fallback RPC
      if (bytecode === '0x' && chainId === 11155111) {
        console.log('🔄 Using fallback RPC for Sepolia...');
        const fallbackProvider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        provider = fallbackProvider;
        
        bytecode = await fallbackProvider.getCode(fheCounter.address);
        console.log('📋 Fallback provider - Contract bytecode length:', bytecode.length);
      }
      
      if (bytecode === '0x') {
        throw new Error(`No contract found at address ${fheCounter.address}. Please verify the contract is deployed on chain ${chainId}.`);
      }

      const contract = new ethers.Contract(
        fheCounter.address,
        fheCounter.abi,
        provider
      );
      
      console.log('🔐 Calling getCount() method...');
      const handle = await contract.getCount();
      console.log('✅ Successfully got count handle:', handle);
      
      setCountHandle(handle);
      setMessage('Count handle loaded successfully');
      
      // Clear previous decrypted value since handle might have changed
      if (handle !== countHandle) {
        setClearCount(undefined);
      }
      
    } catch (error) {
      console.error('❌ Failed to load count:', error);
      setMessage('Failed to load count: ' + (error as Error).message);
    } finally {
      setIsRefreshing(false);
    }
  }, [canRefresh, ethersProvider, fheCounter.address, fheCounter.abi, chainId, countHandle]);

  // Auto-load on mount and when key dependencies change
  useEffect(() => {
    if (isDeployed && ethersProvider && !isRefreshing && fheCounter.address) {
      refreshCountHandle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeployed, ethersProvider, fheCounter.address]); // Remove refreshCountHandle from dependencies to prevent infinite loop

  // Increment the counter
  const incrementCounter = useCallback(async () => {
    if (!canOperate || !fheCounter.address || !account) return;
    if (isIncrementing) return; // Prevent double execution
    
    setIsIncrementing(true);
    setMessage('Start increment(1)...');

    // Store current values to check if stale later
    const currentChainId = chainId;
    const currentAddress = fheCounter.address;
    const currentAccount = account;

    try {
      const signer = await ethersProvider!.getSigner();
      
      // Check if operation is still valid
      const isStale = () => 
        chainId !== currentChainId || 
        fheCounter.address !== currentAddress || 
        account !== currentAccount;
      
      setMessage('Encrypting input...');
      
      // Let browser repaint before CPU-intensive operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create encrypted input
      const encryptedInputBuilder = fhevmInstance!.createEncryptedInput(
        fheCounter.address, 
        account
      );
      encryptedInputBuilder.add32(1);
      const encryptedInput = await encryptedInputBuilder.encrypt();
      
      if (isStale()) {
        setMessage('Ignore increment(1)');
        return;
      }
      
      setMessage('Call increment(1)...');
      
      // Call contract
      const contract = new ethers.Contract(
        fheCounter.address,
        fheCounter.abi,
        signer
      );
      
      const tx = await contract.increment(encryptedInput.handles[0], encryptedInput.inputProof);
      setMessage(`Wait for tx:${tx.hash}...`);
      
      const receipt = await tx.wait();
      setMessage(`Call increment(1) completed status=${receipt?.status}`);
      
      if (isStale()) {
        setMessage('Ignore increment(1)');
        return;
      }
      
      // Refresh the count handle
      refreshCountHandle();
    } catch (error) {
      console.error('Increment failed:', error);
      setMessage('increment(1) Failed!');
    } finally {
      setIsIncrementing(false);
    }
  }, [canOperate, ethersProvider, account, fhevmInstance, refreshCountHandle, fheCounter.address, fheCounter.abi, chainId, isIncrementing]);

  // Decrement the counter
  const decrementCounter = useCallback(async () => {
    if (!canOperate || !fheCounter.address || !account) return;
    if (isDecrementing) return; // Prevent double execution
    
    setIsDecrementing(true);
    setMessage('Start decrement(1)...');

    // Store current values to check if stale later
    const currentChainId = chainId;
    const currentAddress = fheCounter.address;
    const currentAccount = account;

    try {
      const signer = await ethersProvider!.getSigner();
      
      // Check if operation is still valid
      const isStale = () => 
        chainId !== currentChainId || 
        fheCounter.address !== currentAddress || 
        account !== currentAccount;
      
      setMessage('Encrypting input...');
      
      // Let browser repaint before CPU-intensive operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create encrypted input
      const encryptedInputBuilder = fhevmInstance!.createEncryptedInput(
        fheCounter.address, 
        account
      );
      encryptedInputBuilder.add32(1);
      const encryptedInput = await encryptedInputBuilder.encrypt();
      
      if (isStale()) {
        setMessage('Ignore decrement(1)');
        return;
      }
      
      setMessage('Call decrement(1)...');
      
      // Call contract
      const contract = new ethers.Contract(
        fheCounter.address,
        fheCounter.abi,
        signer
      );
      
      const tx = await contract.decrement(encryptedInput.handles[0], encryptedInput.inputProof);
      setMessage(`Wait for tx:${tx.hash}...`);
      
      const receipt = await tx.wait();
      setMessage(`Call decrement(1) completed status=${receipt?.status}`);
      
      if (isStale()) {
        setMessage('Ignore decrement(1)');
        return;
      }
      
      // Refresh the count handle
      refreshCountHandle();
    } catch (error) {
      console.error('Decrement failed:', error);
      setMessage('decrement(1) Failed!');
    } finally {
      setIsDecrementing(false);
    }
  }, [canOperate, ethersProvider, account, fhevmInstance, refreshCountHandle, fheCounter.address, fheCounter.abi, chainId, isDecrementing]);

  // Decrypt the current count handle using proper signature-based decryption
  const decryptCount = useCallback(async () => {
    if (!countHandle || !fhevmInstance || !ethersProvider || !account || !fheCounter.address) return;
    if (isDecrypting) return; // Prevent double execution
    
    if (countHandle === ethers.ZeroHash) {
      setClearCount(BigInt(0));
      setMessage('Count is 0 (uninitialized)');
      return;
    }

    // Store current values to check if stale later
    const currentChainId = chainId;
    const currentAddress = fheCounter.address;
    const currentAccount = account;
    const currentCountHandle = countHandle;

    setIsDecrypting(true);
    setMessage('Start decrypt');

    try {
      const signer = await ethersProvider!.getSigner();
      
      // Check if operation is still valid
      const isStale = () => 
        chainId !== currentChainId || 
        fheCounter.address !== currentAddress || 
        account !== currentAccount ||
        countHandle !== currentCountHandle;

      // Load or create decryption signature
      const sig: FhevmDecryptionSignature | null = 
        await FhevmDecryptionSignature.loadOrSign(
          fhevmInstance,
          [fheCounter.address as `0x${string}`],
          signer,
          signatureStorage
        );

      if (!sig) {
        setMessage('Unable to build FHEVM decryption signature');
        return;
      }

      if (isStale()) {
        setMessage('Ignore FHEVM decryption');
        return;
      }

      setMessage('Call FHEVM userDecrypt...');

      // Perform the decryption using the signature
      const res = await fhevmInstance.userDecrypt(
        [{ handle: currentCountHandle, contractAddress: currentAddress }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      setMessage('FHEVM userDecrypt completed!');

      if (isStale()) {
        setMessage('Ignore FHEVM decryption');
        return;
      }

      // Update the clear count with the decrypted value
      const decryptedValue = res[currentCountHandle];
      setClearCount(BigInt(decryptedValue));
      setMessage('Count handle clear value is ' + decryptedValue);

    } catch (error) {
      console.error('Decryption failed:', error);
      setMessage('Decryption failed: ' + (error as Error).message);
    } finally {
      setIsDecrypting(false);
    }
  }, [countHandle, fhevmInstance, ethersProvider, account, fheCounter.address, chainId, signatureStorage, isDecrypting]);

  if (!isConnected) {
    return (
      <div className="fhe-container">
        <div className="connect-section">
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2>🔗 Connect Your Wallet</h2>
            <p>Please connect MetaMask to use the FHE Counter</p>
          </div>
          <button
            onClick={connectWallet}
            className="neon-button primary large"
          >
            🔗 Connect MetaMask
          </button>
          {chainId && chainId !== 11155111 && chainId !== 31337 && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '5px', maxWidth: '400px' }}>
              <p><strong>Network Not Supported</strong></p>
              <p>Current network: Chain ID {chainId}</p>
              <p>Please switch to a supported network:</p>
              <button 
                onClick={switchToSepolia}
                className="neon-button secondary"
                style={{ marginTop: '10px', marginRight: '10px' }}
              >
                🌐 Switch to Sepolia
              </button>
              <p style={{ fontSize: '0.9em', marginTop: '10px', color: '#666' }}>
                Or manually switch to Hardhat local network (Chain ID: 31337)
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isDeployed) {
    return (
      <div className="fhe-container">
        <div className="error-section">
          <h2>❌ Contract Not Deployed</h2>
          <p>FHECounter contract is not deployed on this network</p>
          <p><strong>Current Network:</strong> Chain ID {chainId} {chainId === 11155111 ? '(Sepolia)' : chainId === 31337 ? '(Hardhat)' : ''}</p>
          <p><strong>Contract Address:</strong> {fheCounter.address || 'Not found in address mapping'}</p>
          {chainId === 11155111 && !fheCounter.address && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '5px' }}>
              <p><strong>Deployment Required:</strong></p>
              <p>The contract needs to be deployed to Sepolia network.</p>
              <p>Run: <code style={{ backgroundColor: '#f8f9fa', padding: '2px 4px' }}>npx hardhat deploy --network sepolia</code></p>
            </div>
          )}
          {chainId === 31337 && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: '5px' }}>
              <p><strong>Local Network:</strong> Make sure Hardhat node is running</p>
              <p>Expected address: 0x7553CB9124f974Ee475E5cE45482F90d5B6076BC</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fhe-container">
      <div className="header-section">
        <h1>🔒 FHE Counter Demo</h1>
        <p>Fully Homomorphic Encryption Counter using Zama FHEVM</p>
      </div>

      <div className="info-grid">
        <div className="info-card">
          <h3>🌐 Network Info</h3>
          <div className="info-item">
            <span className="label">Chain ID:</span>
            <span className="value">{chainId}</span>
          </div>
          <div className="info-item">
            <span className="label">Account:</span>
            <span className="value">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'N/A'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>📋 Contract Info</h3>
          <div className="info-item">
            <span className="label">Address:</span>
            <span className="value">{fheCounter.address ? `${fheCounter.address.slice(0, 8)}...` : 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="label">Deployed:</span>
            <span className="value">{isDeployed ? '✅ Yes' : '❌ No'}</span>
          </div>
        </div>

        <div className="info-card">
          <h3>🔐 FHEVM Status</h3>
          <div className="info-item">
            <span className="label">Instance:</span>
            <span className="value">{fhevmInstance ? '✅ Ready' : '❌ Not Ready'}</span>
          </div>
          <div className="info-item">
            <span className="label">Status:</span>
            <span className="value">{fhevmStatus}</span>
          </div>
        </div>
      </div>

      <div className="count-section">
        <div className="count-display">
          <h3>📊 Encrypted Count</h3>
          <div className="count-info">
            <div className="info-item">
              <span className="label">Handle:</span>
              <span className="value monospace">
                {countHandle ? `${countHandle.slice(0, 10)}...${countHandle.slice(-8)}` : 'Not loaded'}
              </span>
            </div>
            <div className="info-item">
              <span className="label">Clear Value:</span>
              <span className="value">
                {clearCount !== undefined ? clearCount.toString() : 'Not decrypted'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="controls-section">
        <div className="button-group">
          <button
            onClick={refreshCountHandle}
            disabled={!canRefresh}
            className={`neon-button secondary ${!canRefresh ? 'disabled' : ''}`}
          >
            {isRefreshing ? '🔄 Loading...' : '🔄 Refresh Count'}
          </button>

          <button
            onClick={decryptCount}
            disabled={!countHandle || !fhevmInstance || isDecrypting || clearCount !== undefined}
            className={`neon-button info ${(!countHandle || !fhevmInstance || isDecrypting || clearCount !== undefined) ? 'disabled' : ''}`}
          >
            {isDecrypting ? '⏳ Decrypting...' : clearCount !== undefined ? '✅ Decrypted' : '🔓 Decrypt Count'}
          </button>
        </div>

        <div className="button-group">
          <button
            onClick={incrementCounter}
            disabled={!canOperate}
            className={`neon-button success ${!canOperate ? 'disabled' : ''}`}
          >
            {isIncrementing ? '⏳ Processing...' : '➕ Increment (+1)'}
          </button>

          <button
            onClick={decrementCounter}
            disabled={!canOperate}
            className={`neon-button warning ${!canOperate ? 'disabled' : ''}`}
          >
            {isDecrementing ? '⏳ Processing...' : '➖ Decrement (-1)'}
          </button>
        </div>
      </div>

      <div className="status-section">
        <div className="status-display">
          <h4>📝 Status</h4>
          <p className="status-message">{message}</p>
        </div>
      </div>

      {fhevmError && (
        <div className="error-section">
          <h4>⚠️ FHEVM Error</h4>
          <p className="error-message">{fhevmError.message}</p>
        </div>
      )}
    </div>
  );
};

export default FHECounterDemo;