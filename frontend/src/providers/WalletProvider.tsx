import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useMetaMask } from '../hooks/useMetaMaskProvider';

interface WalletContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  error?: Error;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const metaMask = useMetaMask();
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const account = metaMask.accounts?.[0] || null;
  const chainId = metaMask.chainId || null;
  const isConnected = metaMask.isConnected;

  // Initialize ethers provider when MetaMask provider is available
  useEffect(() => {
    const initializeProvider = async () => {
      if (metaMask.provider && metaMask.isConnected) {
        try {
          const browserProvider = new ethers.BrowserProvider(metaMask.provider);
          setProvider(browserProvider);
        } catch (error) {
          console.error('Failed to initialize ethers provider:', error);
        }
      } else {
        setProvider(null);
      }
    };

    initializeProvider();
  }, [metaMask.provider, metaMask.isConnected]);

  // MetaMask handles account and chain change events automatically

  const connectWallet = useCallback(async () => {
    if (!metaMask.provider) {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    try {
      metaMask.connect();
      
      // Wait for connection to establish
      if (account) {
        toast.success(`Connected to ${account.slice(0, 6)}...${account.slice(-4)}`);
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      if (error.code === 4001) {
        toast.error('Wallet connection rejected by user');
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [metaMask, account]);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    toast.info('Wallet disconnected');
  }, []);

  const switchNetwork = useCallback(async (targetChainId: number) => {
    if (!metaMask.provider) {
      toast.error('MetaMask not available');
      return;
    }

    try {
      await metaMask.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethers.toQuantity(targetChainId) }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added to MetaMask
        try {
          const networkConfig = getNetworkConfig(targetChainId);
          if (networkConfig) {
            await metaMask.provider.request({
              method: 'wallet_addEthereumChain',
              params: [networkConfig],
            });
          }
        } catch (addError) {
          console.error('Failed to add network:', addError);
          toast.error('Failed to add network to MetaMask');
        }
      } else {
        console.error('Failed to switch network:', error);
        toast.error('Failed to switch network');
      }
    }
  }, [metaMask.provider]);

  const contextValue: WalletContextType = {
    account,
    provider,
    chainId,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    error: metaMask.error,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Helper function to get network configuration
const getNetworkConfig = (chainId: number) => {
  const networks: Record<number, any> = {
    11155111: {
      chainId: ethers.toQuantity(11155111),
      chainName: 'Sepolia Testnet',
      nativeCurrency: {
        name: 'SepoliaETH',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['https://sepolia.infura.io/v3/', 'https://rpc.sepolia.org'],
      blockExplorerUrls: ['https://sepolia.etherscan.io'],
    },
    31337: {
      chainId: ethers.toQuantity(31337),
      chainName: 'Hardhat Local',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['http://127.0.0.1:8545'],
      blockExplorerUrls: [],
    },
  };

  return networks[chainId] || null;
};