// src/context/Web3Context.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ROYALTY_DISTRIBUTOR_ABI } from '../config/contracts';

const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is required!");
      return;
    }
    try {
      setIsConnecting(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const userSigner = await browserProvider.getSigner();

      const distributorContract = new ethers.Contract(
        CONTRACT_ADDRESSES.RoyaltyDistributor,
        ROYALTY_DISTRIBUTOR_ABI,
        userSigner
      );

      setAccount(accounts[0]);
      setProvider(browserProvider);
      setSigner(userSigner);
      setContract(distributorContract);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const triggerPayout = async (trackId, streamCount) => {
    if (!contract) throw new Error("Wallet not connected");
    const tx = await contract.triggerPayout(trackId, streamCount);
    await tx.wait();
    return tx;
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts.length > 0 ? accounts[0] : null);
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{ account, provider, signer, contract, isConnecting, connectWallet, triggerPayout }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);