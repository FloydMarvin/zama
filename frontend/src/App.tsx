import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { WalletProvider, useWalletContext } from './providers/WalletProvider';
import { MetaMaskProvider } from './hooks/useMetaMaskProvider';
import { FHEVMProvider } from './providers/FHEVMProvider';
import FHECounterDemo from './components/fhevm/FHECounterDemo';
import './styles/global.css';

/**
 * Neon FHE DApp - Focused on FHE Functionality
 * Features: NeonFHEDataNode with encrypted operations
 */
const AppContent: React.FC = () => {
  const { isConnected, connectWallet, chainId, switchNetwork } = useWalletContext();

  const switchToSepolia = async () => {
    await switchNetwork(11155111);
  };

  return (
    <FHEVMProvider>
      {!isConnected ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
        }}>
          <button
            onClick={connectWallet}
            style={{
              background: 'linear-gradient(45deg, #0a0a0a, #1a1a2e)',
              border: '2px solid #00ffff',
              borderRadius: '15px',
              padding: '20px 40px',
              color: '#00ffff',
              fontFamily: 'Courier New, monospace',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#ff6b6b';
              e.currentTarget.style.color = '#ff6b6b';
              e.currentTarget.style.textShadow = '0 0 10px #ff6b6b';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#00ffff';
              e.currentTarget.style.color = '#00ffff';
              e.currentTarget.style.textShadow = 'none';
            }}
          >
            🔗 Connect MetaMask
          </button>
        </div>
      ) : (
        <>
          {/* Network Warning for non-Sepolia */}
          {chainId !== 11155111 && (
            <div style={{
              background: 'rgba(248, 113, 113, 0.1)',
              border: '2px solid #f87171',
              borderRadius: '10px',
              padding: '15px',
              margin: '20px',
              textAlign: 'center',
              color: '#f87171',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold'
            }}>
              ⚠️ Please switch to Sepolia Testnet for full functionality
              <button
                onClick={switchToSepolia}
                style={{
                  background: 'transparent',
                  border: '1px solid #f87171',
                  borderRadius: '5px',
                  padding: '8px 16px',
                  color: '#f87171',
                  fontFamily: 'Courier New, monospace',
                  cursor: 'pointer',
                  marginLeft: '15px'
                }}
              >
                Switch to Sepolia
              </button>
            </div>
          )}
          
          <FHECounterDemo />
        </>
      )}
    </FHEVMProvider>
  );
};

const App: React.FC = () => {
  return (
    <div className="app-container">
      <MetaMaskProvider>
        <WalletProvider>
          <AppContent />
        </WalletProvider>
      </MetaMaskProvider>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastClassName="custom-toast"
      />
    </div>
  );
};

export default App;