import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useFhevm } from '../../fhevm/useFhevm';
import { useWalletContext } from '../../providers/WalletProvider';
import { useMetaMask } from '../../hooks/useMetaMaskProvider';
import { getFHECounterByChainId, FHECounterInfoType } from '../../utils/contracts';
import './NeonFHEDataNode.css';

const NeonFHEDataNode: React.FC = () => {
  const { provider: ethersProvider, isConnected, chainId, account } = useWalletContext();
  const { provider: eip1193Provider } = useMetaMask();
  const [countHandle, setCountHandle] = useState<string | undefined>(undefined);
  const [clearCount, setClearCount] = useState<bigint | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const [isDecrementing, setIsDecrementing] = useState(false);
  const [inputValue, setInputValue] = useState<string>('1');
  const [message, setMessage] = useState<string>('Ready for FHE operations');
  
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

  // Check if contract is deployed (using template pattern)
  const isDeployed = useMemo(() => {
    return Boolean(fheCounter.address && fheCounter.address !== ethers.ZeroAddress);
  }, [fheCounter.address]);

  // Check if we can perform operations
  const canRefresh = useMemo(() => {
    return isDeployed && ethersProvider && !isRefreshing;
  }, [isDeployed, ethersProvider, isRefreshing]);

  const canOperate = useMemo(() => {
    return isDeployed && fhevmInstance && ethersProvider && !isRefreshing && !isIncrementing && !isDecrementing;
  }, [isDeployed, fhevmInstance, ethersProvider, isRefreshing, isIncrementing, isDecrementing]);

  // Load count handle from contract
  const refreshCountHandle = useCallback(async () => {
    if (!canRefresh || !fheCounter.address) return;
    
    setIsRefreshing(true);
    setMessage('Loading encrypted count...');
    
    try {
      const contract = new ethers.Contract(
        fheCounter.address,
        fheCounter.abi,
        ethersProvider
      );
      
      const handle = await contract.getCount();
      setCountHandle(handle);
      setMessage('Count handle loaded successfully');
      
      // Clear previous decrypted value since handle changed
      setClearCount(undefined);
      
    } catch (error) {
      console.error('Failed to load count:', error);
      setMessage('Failed to load count: ' + (error as Error).message);
    } finally {
      setIsRefreshing(false);
    }
  }, [canRefresh, ethersProvider, fheCounter.address, fheCounter.abi]);

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
    
    const inputNumber = parseInt(inputValue);
    if (isNaN(inputNumber) || inputNumber <= 0) {
      setMessage('Invalid input value');
      return;
    }

    setIsIncrementing(true);
    setMessage(`Encrypting and incrementing by ${inputNumber}...`);

    try {
      const signer = await ethersProvider!.getSigner();
      
      // Create encrypted input
      const encryptedInputBuilder = fhevmInstance!.createEncryptedInput(
        fheCounter.address, 
        account
      );
      encryptedInputBuilder.add32(inputNumber);
      const encryptedInput = await encryptedInputBuilder.encrypt();
      
      setMessage('Calling increment function...');
      
      // Call contract
      const contract = new ethers.Contract(
        fheCounter.address,
        fheCounter.abi,
        signer
      );
      
      const tx = await contract.increment(encryptedInput.handles[0], encryptedInput.inputProof);
      setMessage(`Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      setMessage(`Increment completed! Gas used: ${receipt.gasUsed.toString()}`);
      
      // Refresh the count handle
      await refreshCountHandle();
    } catch (error) {
      console.error('Increment failed:', error);
      setMessage('Increment failed: ' + (error as Error).message);
    } finally {
      setIsIncrementing(false);
    }
  }, [canOperate, inputValue, ethersProvider, account, fhevmInstance, refreshCountHandle, fheCounter.address, fheCounter.abi]);

  // Decrement the counter
  const decrementCounter = useCallback(async () => {
    if (!canOperate || !fheCounter.address || !account) return;
    
    const inputNumber = parseInt(inputValue);
    if (isNaN(inputNumber) || inputNumber <= 0) {
      setMessage('Invalid input value');
      return;
    }

    setIsDecrementing(true);
    setMessage(`Encrypting and decrementing by ${inputNumber}...`);

    try {
      const signer = await ethersProvider!.getSigner();
      
      // Create encrypted input
      const encryptedInputBuilder = fhevmInstance!.createEncryptedInput(
        fheCounter.address, 
        account
      );
      encryptedInputBuilder.add32(inputNumber);
      const encryptedInput = await encryptedInputBuilder.encrypt();
      
      setMessage('Calling decrement function...');
      
      // Call contract
      const contract = new ethers.Contract(
        fheCounter.address,
        fheCounter.abi,
        signer
      );
      
      const tx = await contract.decrement(encryptedInput.handles[0], encryptedInput.inputProof);
      setMessage(`Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      setMessage(`Decrement completed! Gas used: ${receipt.gasUsed.toString()}`);
      
      // Refresh the count handle
      await refreshCountHandle();
    } catch (error) {
      console.error('Decrement failed:', error);
      setMessage('Decrement failed: ' + (error as Error).message);
    } finally {
      setIsDecrementing(false);
    }
  }, [canOperate, inputValue, ethersProvider, account, fhevmInstance, refreshCountHandle, fheCounter.address, fheCounter.abi]);

  if (!isConnected) {
    return (
      <div className="neon-container">
        <div className="neon-card">
          <h2 className="neon-title">🔗 Connect MetaMask to Access FHE Counter</h2>
        </div>
      </div>
    );
  }

  if (!isDeployed) {
    return (
      <div className="neon-container">
        <div className="neon-card">
          <h2 className="neon-title">❌ Contract Not Deployed</h2>
          <p className="message-display">
            FHE Counter contract not found on chain {chainId}.<br/>
            Expected address: {fheCounter.address || 'Not deployed'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="neon-container">
      <div className="neon-header">
        <h1 className="neon-title">⚡ NEON FHE COUNTER</h1>
        <div className="neon-subtitle">Privacy-Preserving Encrypted Operations</div>
      </div>

      {/* Status Panel */}
      <div className="neon-grid">
        <div className="neon-card status-card">
          <h3 className="neon-section-title">📊 System Status</h3>
          <div className="grid-stats">
            <div className="stat-row">
              <span className="stat-label">Chain ID:</span>
              <span className="stat-value">{chainId}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">FHEVM Status:</span>
              <span className={`stat-value status-${fhevmStatus}`}>
                {fhevmStatus.toUpperCase()}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Contract:</span>
              <span className="stat-value">{isDeployed ? '✅ DEPLOYED' : '❌ NOT FOUND'}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Operations:</span>
              <span className={`stat-value ${canOperate ? 'ready' : 'disabled'}`}>
                {canOperate ? '✅ READY' : '❌ DISABLED'}
              </span>
            </div>
          </div>
        </div>

        <div className="neon-card value-card">
          <h3 className="neon-section-title">📊 Encrypted Count</h3>
          <div className="revealed-value">
            {countHandle ? (
              <div>
                <div className="handle-display">Handle: {countHandle.slice(0, 10)}...{countHandle.slice(-8)}</div>
                {clearCount !== undefined ? (
                  <span className="decrypted-number">Clear Value: {clearCount.toString()}</span>
                ) : (
                  <span className="encrypted-placeholder">🔒 NOT DECRYPTED</span>
                )}
              </div>
            ) : (
              <span className="encrypted-placeholder">Not loaded</span>
            )}
          </div>
          <button 
            className="neon-button decrypt-btn"
            onClick={refreshCountHandle}
            disabled={!canRefresh}
          >
            {isRefreshing ? '🔄 LOADING...' : '🔄 REFRESH COUNT'}
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="neon-card control-panel">
        <h3 className="neon-section-title">⚙️ Counter Operations</h3>
        <div className="control-row">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="neon-input"
            placeholder="Enter value"
            min="1"
          />
          <button 
            className="neon-button amplify-btn"
            onClick={incrementCounter}
            disabled={!canOperate}
          >
            {isIncrementing ? '⏳ PROCESSING...' : '➕ INCREMENT'}
          </button>
          <button 
            className="neon-button dampen-btn"
            onClick={decrementCounter}
            disabled={!canOperate}
          >
            {isDecrementing ? '⏳ PROCESSING...' : '➖ DECREMENT'}
          </button>
        </div>
      </div>

      {/* Message Panel */}
      <div className="neon-card message-panel">
        <h3 className="neon-section-title">📡 System Messages</h3>
        <div className="message-display">
          {fhevmError ? `FHEVM Error: ${fhevmError.message}` : message}
        </div>
      </div>

      {/* Contract Info */}
      <div className="neon-card info-panel">
        <h3 className="neon-section-title">🔗 Contract Information</h3>
        <div className="contract-info">
          <div className="info-row">
            <span className="info-label">Contract Address:</span>
            <a 
              href={`https://sepolia.etherscan.io/address/${fheCounter.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="contract-link"
            >
              {fheCounter.address}
            </a>
          </div>
          <div className="info-row">
            <span className="info-label">Network:</span>
            <span className="info-value">{fheCounter.chainName || `Chain ID ${chainId}`}</span>
          </div>
          <div className="info-row">
            <span className="info-label">FHEVM Instance:</span>
            <span className={`info-value ${fhevmInstance ? 'connected' : 'disconnected'}`}>
              {fhevmInstance ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeonFHEDataNode;