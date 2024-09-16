import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Web3 from 'web3';
import commonStyles from './CommonStyles.module.css';
import styles from './GettingStarted.module.css';
import Logo from './Logo';
import metamaskLogo from './images/metamask.png';

import GClogo from './images/google_chrome_logo.png';
import FFlogo from './images/firefox_logo.png';

import { GameContext } from './GameContext';

import axios from 'axios';
const database_api = axios.create({
  baseURL: 'http://localhost:6969/'
});

function GettingStarted({ setWeb3, setUserAddress }) {
  const [isLoaded, setIsLoaded] = useState(false); // State to track loading
  const [isSafari, setIsSafari] = useState(false);
  const { setGameState } = useContext(GameContext);
  const location = useLocation();

  const navigate = useNavigate();

  // Fade-In Animation
  useEffect(() => {
    setIsLoaded(true); // Set to true when component mounts
  }, []);

  // Define isSafari inside useEffect to set state based on the check
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.indexOf('Chrome') > -1;
    const safariCheck = userAgent.indexOf('Safari') > -1;
    setIsSafari(safariCheck && !isChrome);
    setIsLoaded(true);
  }, []);

  // Function to handle connecting to MetaMask
  const connectWallet = async () => {
    if (window.ethereum) { // Check if MetaMask is installed
      try {
        // Request account access if needed
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);
        setUserAddress(accounts[0]);
        setGameState(prevState => ({ ...prevState, userAddress: accounts[0] }));

        const response = await database_api.post('/api/add-player', { address: accounts[0] });

        // Check the affectedRows to determine if a new player was added
        if (response.data.results.affectedRows === 0) {
          console.warn('Player already exists in the database');
        } else if (response.data.results.affectedRows > 0) {
          console.log('Player added successfully');
        }

        const params = new URLSearchParams(location.search);
        const redirectTo = params.get('redirect');
    
        if (redirectTo === 'partner') {
          navigate('/become-a-partner');
        } else {
          navigate('/betting');
        }

      } catch (error) {
        console.error('Failed to connect to MetaMask', error);
      }
    } else {
      alert('Please install MetaMask first!');
    }
  };

  return (
    <div className={`${commonStyles.container} ${isLoaded ? commonStyles.loaded : ''}`}>
      <div>
        <Logo />
      </div>
      <div className={`${commonStyles.content} ${styles.content}`}>
        {isSafari ? 
        (
          <>
            <h1 id={styles.header} style={{fontSize: '24px'}}>Oops! It seems like you're using Safari!</h1>
            <span>Please install Chrome or Firefox!</span>
            <div id={styles.browsers}>
              <Link to="https://www.google.com/chrome">
                <img src={GClogo} alt={"Google Chrome Logo"} className={styles.browserLogo} />
              </Link>
              <Link to="https://www.mozilla.org/firefox/">
                <img src={FFlogo} alt={"Firefox Logo"} className={styles.browserLogo} />
              </Link>
            </div>
          </>
        ) 
        : 
        (
        <>
          <h1 id={styles.header}>Let's get you started!</h1>
          <button id={styles.connect} onClick={connectWallet}>
              <img src={metamaskLogo} className={styles.mm_logo} alt="MetaMask logo"/>
              Connect to MetaMask!
          </button>
          <br />
          <span>Don’t have MetaMask installed yet? <a href="https://metamask.io/download/">Click here.</a></span>
        </>
        )}
      </div>
    </div>
  );
}

export default GettingStarted;
