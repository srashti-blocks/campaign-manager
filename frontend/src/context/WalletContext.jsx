import { createContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const WalletContext = createContext(null);

const SEPOLIA_CHAIN_ID = '0xaa36a7';

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  
  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;

  // Shared helper to prevent code duplication across mount checks and connections
  const fetchWalletData = async () => {
    const prov = new ethers.BrowserProvider(window.ethereum);
    const sig = await prov.getSigner();
    const userAddress = await sig.getAddress();
    const network = await prov.getNetwork();
    const currentChainHex = '0x' + network.chainId.toString(16);

    return { prov, sig, userAddress, currentChainHex };
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
      } else {
        disconnectWallet();
      }
    };

    // Rebuild provider and signer on chain change to avoid stale state bugs
    const handleChainChanged = async () => {
      try {
        const { prov, sig, userAddress, currentChainHex } = await fetchWalletData();
        setProvider(prov);
        setSigner(sig);
        setAddress(userAddress);
        setChainId(currentChainHex);
      } catch (err) {
        console.error("Error handling chain change:", err);
      }
    };

    // Check initial connection silently on mount
    window.ethereum.request({ method: 'eth_accounts' })
      .then(async (accounts) => {
        if (accounts.length > 0) {
          const { prov, sig, userAddress, currentChainHex } = await fetchWalletData();
          setProvider(prov);
          setSigner(sig);
          setAddress(userAddress);
          setChainId(currentChainHex);
        }
      })
      .catch(err => console.error("Error checking accounts:", err));

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is required to use this application.");
      return;
    }
    try {
      const { prov, sig, userAddress, currentChainHex } = await fetchWalletData();

      setProvider(prov);
      setSigner(sig);
      setAddress(userAddress);
      setChainId(currentChainHex);

      if (currentChainHex !== SEPOLIA_CHAIN_ID) {
        await switchToSepolia();
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        alert("Please add the Sepolia network to your MetaMask.");
      } else {
        console.error("Failed to switch network:", switchError);
      }
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setSigner(null);
    setProvider(null);
    setChainId(null);
  };

  return (
    <WalletContext.Provider value={{
      address,
      chainId,
      signer,
      provider,
      isCorrectNetwork,
      connectWallet,
      disconnectWallet,
      switchToSepolia
    }}>
      {children}
    </WalletContext.Provider>
  );
};











































