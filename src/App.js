// App.js
import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import BettingComponent from './BettingComponent';
import TransactionComponent from './TransactionComponent';
import RouletteComponent from './RouletteComponent';
import OutcomeComponent from './OutcomeComponent';
import LandingPage from './LandingPage';
import GettingStarted from './GettingStarted';
import BecomePartner from './BecomePartner';
import PartnerDashboard from './PartnerDashboard';
import detectEthereumProvider from '@metamask/detect-provider';
import { GameContext } from './GameContext';

import Chat from './Chat';

import axios from 'axios';
const database_api = axios.create({
  baseURL: 'http://localhost:6969/'
});

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false); // State to control chat visibility
  const [web3, setWeb3] = useState(null); // Maintain web3 state at the App level
  const [userAddress, setUserAddress] = useState('');
  const { setGameState } = useContext(GameContext);
  const [unreadCounter, setUnreadCounter] = useState(0);

  useEffect(() => {
    let provider;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setUserAddress(accounts[0]);
        setGameState(prevState => ({
          ...prevState,
          userAddress: accounts[0]
        }));
        checkAndAddPlayer(accounts[0]); // Function to check and add player to the database
      } else {
        console.log('Please connect to MetaMask.');
        setUserAddress('');
        setGameState(prevState => ({
          ...prevState,
          userAddress: ''
        }));
      }
    };

    const init = async () => {
      provider = await detectEthereumProvider();
      if (provider && web3) {
        provider.on('accountsChanged', handleAccountsChanged);
      }
    };

    init();

    return () => {
      if (provider) {
        provider.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [web3, setGameState]);

  const checkAndAddPlayer = async (address) => {
    const response = await database_api.post('/api/add-player', { address });
    if (!response.data.success) {
      console.error('Failed to add player', response);
    }
  };

  return (
    <>
      <Chat setIsChatOpen={setIsChatOpen} isChatOpen={isChatOpen} setUnreadCounter={setUnreadCounter} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/getting-started" element={<GettingStarted setWeb3={setWeb3} setUserAddress={setUserAddress} />} />
        <Route path="/betting" element={<BettingComponent web3={web3} setIsChatOpen={setIsChatOpen} isChatOpen={isChatOpen} userAddress={userAddress} unreadCounter={unreadCounter} setUnreadCounter={setUnreadCounter} />} />
        <Route path="/transactions" element={<TransactionComponent />} />
        <Route path="/roulette" element={<RouletteComponent />} />
        <Route path="/outcome" element={<OutcomeComponent />} />
        <Route path="/become-a-partner" element={<BecomePartner web3={web3} />} />
        <Route path="/partner-dashboard" element={<PartnerDashboard />} />
      </Routes>
    </>
  );
}

export default App;
