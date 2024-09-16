import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from './GameContext';
import styles from './BettingComponent.module.css';
import commonStyles from './CommonStyles.module.css';
import Logo from './Logo';
import io from 'socket.io-client';
import metamaskLogo from'./images/metamask.png';
import rouletteContractAbi from './abis/rouletteContractAbi.json';
import axios from 'axios';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';

import { ReactComponent as Check } from './images/check.svg'
import { ReactComponent as Donate } from './images/donate.svg'
import { ReactComponent as RouletteBack } from './images/roulette_back.svg'
import { ReactComponent as RouletteSpinning } from './images/roulette_spinning.svg'

const contractAddress = "0xa390Afb2bA2e7c4bFfddCB8Fb0b3d9e51a11FeD0";

// Initialize socket connection
const socket = io('https://greenroulette.io:3001', { secure: true });

// Create an instance of axios with a base URL
const database_api = axios.create({
  baseURL: 'https://greenroulette.io:6969/'
});

function BettingComponent({ web3, isChatOpen, setIsChatOpen, userAddress, unreadCounter }) {
  const navigate = useNavigate();

  // Move this useEffect to the top of your component
  useEffect(() => {
    if (!web3) {
      navigate('/getting-started');
    }
  }, [web3, navigate]);

  const [betAmount, setBetAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [ethAmountDonation, setEthAmountDonation] = useState('');
  const [poolSize, setPoolSize] = useState('0');

  const { gameState, setGameState, resetGameState } = useContext(GameContext);
  const [finishStatus, setfinishStatus] = useState(false);

  const [specialStyle, setSpecialStyle] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // State to track loading
  const [betPlaced, setIsPlaced] = useState(-1); // State to track loading

  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // State to control chat visibility
  const [username, setUsername] = useState('');
  const [isDonation, setIsDonation] = useState(false);
  const [showDonations, setShowDonations] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Replace your address in the chat and the leaderboards with your own custom username!');
  const [donationMessage, setDonationMessage] = useState('If you like what GreenRoulette is doing and would like to support us, you can donate to the pool directly here.');
  const [donationAmount, setDonationAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [groupedDonations, setGroupedDonations] = useState({});

  const [confettiActive, setConfettiActive] = useState(false);
  const [fadeOutConfetti, setFadeOutConfetti] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  // Move the contract initialization inside a useEffect
  const [contract, setContract] = useState(null);

  useEffect(() => {
    if (web3) {
      const newContract = new web3.eth.Contract(rouletteContractAbi, contractAddress);
      setContract(newContract);
    }
  }, [web3]);

  useEffect(() => {
    const fetchPoolSize = async () => {
      if (contract && web3) {
        try {
          const poolSizeWEI = await contract.methods.temporaryBalance().call();
          const poolSizeEth = web3.utils.fromWei(poolSizeWEI, 'ether');
          setPoolSize(poolSizeEth);
          console.log("Pool size: " + poolSizeEth);
        } catch (error) {
          console.error("Error fetching pool size:", error);
        }
      }
    };

    fetchPoolSize();
  }, [contract, web3]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (gameState.bet.placed) {
        event.preventDefault(); // This is necessary to trigger the dialog
        event.returnValue = ''; // Modern browsers require returnValue to be set
      }
    };

    const handleBeforeRouteChange = () => {
      if (gameState.bet.placed) {
        const confirmationMessage = 'You have placed a bet. Are you sure you want to leave? Leaving / refreshing will cause the elements in the page to not reflect you having placed a bet.';
        return window.confirm(confirmationMessage);
      }
      return true;
    };

    const onBackButtonEvent = (e) => {
      e.preventDefault();
      if (!finishStatus) {
        if (window.confirm("You have placed a bet. Are you sure you want to leave? Leaving / refreshing will cause the elements in the page to not reflect you having placed a bet.")) {
          setfinishStatus(true)
          navigate('/');
        } else {
          window.history.pushState(null, null, window.location.pathname);
          setfinishStatus(false)
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // If you use React Router, add a listener for route changes
    if (typeof window !== 'undefined') {
      window.onpopstate = handleBeforeRouteChange;
    }

    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener('popstate', onBackButtonEvent);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', onBackButtonEvent);  
      if (typeof window !== 'undefined') {
        window.onpopstate = null;
      }
    };
  }, [gameState.bet.placed, finishStatus, navigate]);

  // Convert USD amount to ETH
  useEffect(() => {
    if (gameState.exchange && betAmount) {
      const ethEquivalent = parseFloat(betAmount) / gameState.exchange;
      setEthAmount(ethEquivalent.toFixed(4));
    }
  }, [betAmount, gameState.exchange]);

  // Convert USD amount of bet to ETH
  useEffect(() => {
    if (gameState.exchange && donationAmount) {
      const ethEquivalent = parseFloat(donationAmount) / gameState.exchange;
      setEthAmountDonation(ethEquivalent.toFixed(4));
    }
  }, [donationAmount, gameState.exchange]);

  // Reset game state when component mounts
  useEffect(() => {
    resetGameState(); // Reset game state on component mount

    // Additional logic to set up or fetch initial data if necessary
  }, [resetGameState]);

  // Fade-In Animation
  useEffect(() => {
    setIsLoaded(true); // Set to true when component mounts
  }, []);
  
  // Get game state information
  const timerHandler = useCallback((data) => {
    console.log('Timer data received:', data);
    
    setGameState(prevState => ({ 
      ...prevState, 
      timer: data.countdown, 
      stage: data.stage, 
      exchange: data.exchange, 
      total_red: data.total_red, 
      total_black: data.total_black 
    }));

    switch (data.stage) {
      case 0:
        setGameState(prevState => ({
          ...prevState,
          has_visited_bet: true
        }));
        break;
      case -1:
      case 1:
      case 2:
        navigate('/transactions');
        break;
      case 3:
        navigate('/roulette');
        break;
      default:
        break;
    }
  }, [setGameState, navigate]);

  // Set up the socket listener
  useEffect(() => {
    socket.on('timer', timerHandler);
  
    return () => {
      socket.off('timer', timerHandler);
    };
  }, [timerHandler]);

  // Change styles according to state
  useEffect(() => {
    if (gameState.timer <= 30 && gameState.timer >= 2) {
      setSpecialStyle(true);
    } else if (gameState.timer <= 1) {
      setIsLoaded(false);
    } else {
      setSpecialStyle(false);
    }
  }, [gameState, navigate, isLoaded]);

  const placeBet = async (guess) => {
    setIsPlacingBet(true);
    try {
      const accounts = await web3.eth.getAccounts();
      const maxBetUSD = parseFloat(poolSize) * gameState.exchange; // 1% of pool size in USD
      const betAmountUSD = parseFloat(ethAmount) * gameState.exchange;

      if (betAmountUSD > maxBetUSD) {
        alert(`Your bet is too large. The maximum bet allowed is $${maxBetUSD.toFixed(2)} USD.`);
        setIsPlacingBet(false);
        return;
      }

      await contract.methods.setBet(guess).send({
        from: accounts[0],
        value: web3.utils.toWei(ethAmount, 'ether')
      });
      setGameState(prevState => ({
        ...prevState,
        bet: { amount: ethAmount, placed: true, choice: guess }
      }));
      setIsPlaced(guess);
    } catch (error) {
      console.error('Error placing bet:', error);
    } finally {
      setIsPlacingBet(false);
    }
  };

  // Toggle chat visibility
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Toggle chat visibility
  const toggleSettings = () => {
    console.log(unreadCounter);
    setIsSettingsOpen(!isSettingsOpen);
    setShowDonations(false);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && username.trim()) {
      updateUsername();
      event.preventDefault(); // Prevent the default action to avoid a form submit behavior
    }
  };

  const handleKeyPressDonation = (event) => {
    if (event.key === 'Enter' && username.trim()) {
      donate();
      event.preventDefault(); // Prevent the default action to avoid a form submit behavior
    }
  };

  const updateUsername = async () => {
    // Check if the username starts with '0x'
    if (username.startsWith('0x')) {
      setStatusMessage("Username cannot start with '0x'. Please choose a different username.");
      return; // Exit the function without making the API request
    }

    try {
        const response = await database_api.post('/api/update-username', { username, userAddress });
        if (response.data.success) {
            setStatusMessage("Username successfully set! Please refresh the page for it to update in chat.");
            setUsername("");
        } else {
            setStatusMessage("Failed to set username.");
        }
    } catch (error) {
        console.error('Error updating username:', error);
        setStatusMessage("Error updating username.");
    }
  };

  const donate = async () => {
    try {
      const accounts = await web3.eth.getAccounts();
      await contract.methods.donate().send({
        from: accounts[0],
        value: web3.utils.toWei(ethAmountDonation, 'ether')
      });

      await database_api.post('/api/donations',{
        userAddress: isAnonymous ? null : userAddress,
        donationAmountUSD: donationAmount,
        donationAmountETH: ethAmountDonation,
        donationDate: new Date().toISOString().slice(0, 10)  // YYYY-MM-DD format
      });

      setDonationMessage("Thank you so much for your donation!");
      setConfettiActive(true);
      
      setTimeout(() => {
        setFadeOutConfetti(true);
        setTimeout(() => {setFadeOutConfetti(false); setConfettiActive(false);}, 2000);
      }, 5000);

    } catch (error) {
      console.error('Error donating:', error);
      setDonationMessage("Error donating...")
    }
  };

  // Fetch donations when the user decides to view them
  useEffect(() => {
    if (showDonations) {
      database_api.get('/api/get_donations')
        .then(response => {
          const grouped = groupDonationsByDate(response.data);
          setGroupedDonations(grouped);
        })
        .catch(error => {
          console.error('Failed to fetch donations:', error);
        });
    }
  }, [showDonations]);

  // Function to group donations by date
  const groupDonationsByDate = (donations) => {
    return donations.reduce((acc, donation) => {
      const date = new Date(donation.donation_date).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(donation);
      return acc;
    }, {});
  };

  const handleCheckboxChange = () => {
    setIsAnonymous(!isAnonymous);
  };

  return (
    <div className={`${commonStyles.container} ${isLoaded ? commonStyles.loaded : ''}`}>
      <div>
        <Logo />
      </div>

      <button onClick={toggleChat} className={`${styles.sideBtn} ${styles.openChatBtn} ${isChatOpen ? styles.hidden : ''}`}>
        <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clip-path="url(#clip0_45_16)">
          <path d="M6.50017 11C10.0908 11 13.0002 8.5375 13.0002 5.5C13.0002 2.4625 10.0908 0 6.50017 0C2.90955 0 0.000174167 2.4625 0.000174167 5.5C0.000174167 6.70625 0.459549 7.82187 1.23767 8.73125C1.1283 9.025 0.965799 9.28438 0.793924 9.50313C0.643924 9.69688 0.490799 9.84687 0.378299 9.95C0.322049 10 0.275174 10.0406 0.243924 10.0656C0.228299 10.0781 0.215799 10.0875 0.209549 10.0906L0.203299 10.0969C0.0314242 10.225 -0.0435758 10.45 0.0251742 10.6531C0.0939242 10.8562 0.284549 11 0.500174 11C1.18142 11 1.86892 10.825 2.4408 10.6094C2.7283 10.5 2.99705 10.3781 3.23142 10.2531C4.1908 10.7281 5.30642 11 6.50017 11ZM14.0002 5.5C14.0002 9.00938 10.9033 11.6531 7.23455 11.9688C7.99392 14.2938 10.5127 16 13.5002 16C14.6939 16 15.8095 15.7281 16.772 15.2531C17.0064 15.3781 17.272 15.5 17.5595 15.6094C18.1314 15.825 18.8189 16 19.5002 16C19.7158 16 19.9095 15.8594 19.9752 15.6531C20.0408 15.4469 19.9689 15.2219 19.7939 15.0938L19.7877 15.0875C19.7814 15.0812 19.7689 15.075 19.7533 15.0625C19.722 15.0375 19.6752 15 19.6189 14.9469C19.5064 14.8437 19.3533 14.6937 19.2033 14.5C19.0314 14.2812 18.8689 14.0187 18.7595 13.7281C19.5377 12.8219 19.997 11.7062 19.997 10.4969C19.997 7.59687 17.3439 5.21875 13.9783 5.0125C13.9908 5.17187 13.997 5.33437 13.997 5.49687L14.0002 5.5Z" fill="url(#paint0_linear_45_16)"/>
          </g>
          <defs>
          <linearGradient id="paint0_linear_45_16" x1="9.99949" y1="0" x2="9.99949" y2="16" gradientUnits="userSpaceOnUse">
          <stop stop-color="#00A4D8"/>
          <stop offset="1" stop-color="#B8E3A9"/>
          </linearGradient>
          <clipPath id="clip0_45_16">
          <rect width="20" height="16" fill="white"/>
          </clipPath>
          </defs>
        </svg>
        {unreadCounter > 0 && (
          <span className={styles.unreadBadge}>
            {unreadCounter}
          </span>
        )}
      </button>

      <button onClick={toggleSettings} className={`${styles.sideBtn} ${styles.settingBtn} ${isSettingsOpen ? styles.hidden : ''}`}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0_112_609)">
        <path d="M19.3711 6.50781C19.4961 6.84766 19.3906 7.22656 19.1211 7.46875L17.4297 9.00781C17.4727 9.33203 17.4961 9.66406 17.4961 10C17.4961 10.3359 17.4727 10.668 17.4297 10.9922L19.1211 12.5312C19.3906 12.7734 19.4961 13.1523 19.3711 13.4922C19.1992 13.957 18.9922 14.4023 18.7539 14.832L18.5703 15.1484C18.3125 15.5781 18.0234 15.9844 17.707 16.3672C17.4766 16.6484 17.0937 16.7422 16.75 16.6328L14.5742 15.9414C14.0508 16.3438 13.4727 16.6797 12.8555 16.9336L12.3672 19.1641C12.2891 19.5195 12.0156 19.8008 11.6562 19.8594C11.1172 19.9492 10.5625 19.9961 9.99609 19.9961C9.42968 19.9961 8.87499 19.9492 8.33593 19.8594C7.97656 19.8008 7.70312 19.5195 7.62499 19.1641L7.13671 16.9336C6.51953 16.6797 5.9414 16.3438 5.41796 15.9414L3.24609 16.6367C2.90234 16.7461 2.51953 16.6484 2.28906 16.3711C1.97265 15.9883 1.68359 15.582 1.42578 15.1523L1.24218 14.8359C1.0039 14.4062 0.79687 13.9609 0.624995 13.4961C0.499995 13.1562 0.605464 12.7773 0.874995 12.5352L2.5664 10.9961C2.52343 10.668 2.49999 10.3359 2.49999 10C2.49999 9.66406 2.52343 9.33203 2.5664 9.00781L0.874995 7.46875C0.605464 7.22656 0.499995 6.84766 0.624995 6.50781C0.79687 6.04297 1.0039 5.59766 1.24218 5.16797L1.42578 4.85156C1.68359 4.42188 1.97265 4.01562 2.28906 3.63281C2.51953 3.35156 2.90234 3.25781 3.24609 3.36719L5.42187 4.05859C5.94531 3.65625 6.52343 3.32031 7.14062 3.06641L7.6289 0.835938C7.70703 0.480469 7.98046 0.199219 8.33984 0.140625C8.8789 0.046875 9.43359 0 9.99999 0C10.5664 0 11.1211 0.046875 11.6602 0.136719C12.0195 0.195312 12.293 0.476562 12.3711 0.832031L12.8594 3.0625C13.4766 3.31641 14.0547 3.65234 14.5781 4.05469L16.7539 3.36328C17.0977 3.25391 17.4805 3.35156 17.7109 3.62891C18.0273 4.01172 18.3164 4.41797 18.5742 4.84766L18.7578 5.16406C18.9961 5.59375 19.2031 6.03906 19.375 6.50391L19.3711 6.50781ZM9.99999 13.125C10.8288 13.125 11.6237 12.7958 12.2097 12.2097C12.7958 11.6237 13.125 10.8288 13.125 10C13.125 9.1712 12.7958 8.37634 12.2097 7.79029C11.6237 7.20424 10.8288 6.875 9.99999 6.875C9.17119 6.875 8.37634 7.20424 7.79029 7.79029C7.20423 8.37634 6.87499 9.1712 6.87499 10C6.87499 10.8288 7.20423 11.6237 7.79029 12.2097C8.37634 12.7958 9.17119 13.125 9.99999 13.125Z" fill="url(#paint0_linear_112_609)"/>
        </g>
        <defs>
        <linearGradient id="paint0_linear_112_609" x1="9.99804" y1="0" x2="9.99804" y2="19.9961" gradientUnits="userSpaceOnUse">
        <stop stop-color="#00A4D8"/>
        <stop offset="1" stop-color="#B8E3A9"/>
        </linearGradient>
        <clipPath id="clip0_112_609">
        <rect width="20" height="20" fill="white"/>
        </clipPath>
        </defs>
        </svg>
      </button>

      <div className={`${commonStyles.popUpContainer} ${styles.settingsContainer} 
                       ${isSettingsOpen ? styles.settingsOpen : styles.settingsClosed} 
                       ${showDonations ? styles.longContent : ''}`}>
        <div className={`${commonStyles.popUpHeader} ${styles.settingsHeader}`}>
          <br />
          <span id={commonStyles.x} onClick={toggleSettings}>✕</span>
        </div>
        <div>
          <div className={styles.settingsMenuButtons}>
            <div className={`${styles.settingsButton} ${!isDonation ? styles.active : ''}`} onClick={() => {setIsDonation(false); setShowDonations(false);}}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.3711 6.50781C19.4961 6.84766 19.3906 7.22656 19.1211 7.46875L17.4297 9.00781C17.4727 9.33203 17.4961 9.66406 17.4961 10C17.4961 10.3359 17.4727 10.668 17.4297 10.9922L19.1211 12.5312C19.3906 12.7734 19.4961 13.1523 19.3711 13.4922C19.1992 13.957 18.9922 14.4023 18.7539 14.832L18.5703 15.1484C18.3125 15.5781 18.0234 15.9844 17.707 16.3672C17.4766 16.6484 17.0938 16.7422 16.75 16.6328L14.5742 15.9414C14.0508 16.3438 13.4727 16.6797 12.8555 16.9336L12.3672 19.1641C12.2891 19.5195 12.0156 19.8008 11.6563 19.8594C11.1172 19.9492 10.5625 19.9961 9.9961 19.9961C9.4297 19.9961 8.87501 19.9492 8.33595 19.8594C7.97657 19.8008 7.70313 19.5195 7.62501 19.1641L7.13673 16.9336C6.51954 16.6797 5.94142 16.3438 5.41798 15.9414L3.2461 16.6367C2.90235 16.7461 2.51954 16.6484 2.28907 16.3711C1.97267 15.9883 1.6836 15.582 1.42579 15.1523L1.2422 14.8359C1.00392 14.4062 0.796885 13.9609 0.62501 13.4961C0.50001 13.1563 0.605479 12.7773 0.87501 12.5352L2.56642 10.9961C2.52345 10.668 2.50001 10.3359 2.50001 10C2.50001 9.66406 2.52345 9.33203 2.56642 9.00781L0.87501 7.46875C0.605479 7.22656 0.50001 6.84766 0.62501 6.50781C0.796885 6.04297 1.00392 5.59766 1.2422 5.16797L1.42579 4.85156C1.6836 4.42187 1.97267 4.01563 2.28907 3.63281C2.51954 3.35156 2.90235 3.25781 3.2461 3.36719L5.42189 4.05859C5.94532 3.65625 6.52345 3.32031 7.14064 3.06641L7.62892 0.835937C7.70704 0.480469 7.98048 0.199219 8.33985 0.140625C8.87892 0.046875 9.4336 0 10 0C10.5664 0 11.1211 0.046875 11.6602 0.136719C12.0195 0.195312 12.293 0.476562 12.3711 0.832031L12.8594 3.0625C13.4766 3.31641 14.0547 3.65234 14.5781 4.05469L16.7539 3.36328C17.0977 3.25391 17.4805 3.35156 17.7109 3.62891C18.0274 4.01172 18.3164 4.41797 18.5742 4.84766L18.7578 5.16406C18.9961 5.59375 19.2031 6.03906 19.375 6.50391L19.3711 6.50781ZM10 13.125C10.8288 13.125 11.6237 12.7958 12.2097 12.2097C12.7958 11.6237 13.125 10.8288 13.125 10C13.125 9.1712 12.7958 8.37634 12.2097 7.79029C11.6237 7.20424 10.8288 6.875 10 6.875C9.17121 6.875 8.37635 7.20424 7.7903 7.79029C7.20425 8.37634 6.87501 9.1712 6.87501 10C6.87501 10.8288 7.20425 11.6237 7.7903 12.2097C8.37635 12.7958 9.17121 13.125 10 13.125Z" fill="url(#paint0_linear_113_666)"/>
              <defs>
              <linearGradient id="paint0_linear_113_666" x1="9.99806" y1="0" x2="9.99806" y2="19.9961" gradientUnits="userSpaceOnUse">
              <stop stop-color="white"/>
              <stop offset="1" stop-color={!isDonation ? 'white' : '#C9C9C9'} />
              </linearGradient>
              </defs>
              </svg>
            </div>
            <div className={`${styles.donationButton} ${isDonation ? styles.active : ''}`} onClick={() => setIsDonation(true)}>
              <svg width="21" height="18" viewBox="0 0 21 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clip-path="url(#clip0_113_653)">
              <path d="M10.9688 0.84375V1.21289C11.1938 1.25508 11.4117 1.30781 11.6086 1.36055C12.0586 1.48008 12.3258 1.94414 12.2063 2.39414C12.0867 2.84414 11.6227 3.11133 11.1727 2.9918C10.7895 2.88984 10.4309 2.81953 10.1109 2.81602C9.8543 2.8125 9.59414 2.87578 9.42891 2.9707C9.35508 3.01641 9.31992 3.05508 9.30586 3.07617C9.29531 3.09375 9.28125 3.11836 9.28125 3.17461C9.28125 3.18516 9.28125 3.19219 9.28125 3.1957C9.28828 3.20273 9.31289 3.23789 9.39727 3.28711C9.60117 3.41016 9.90352 3.50508 10.3605 3.64219L10.3922 3.65273C10.7824 3.76875 11.3027 3.92695 11.7246 4.19062C12.2063 4.49297 12.6422 4.9957 12.6527 5.76914C12.6633 6.56016 12.252 7.13672 11.7141 7.47422C11.4785 7.61836 11.2254 7.72031 10.9652 7.78359V8.15625C10.9652 8.62383 10.5891 9 10.1215 9C9.65391 9 9.27773 8.62383 9.27773 8.15625V7.75547C8.94375 7.67461 8.63789 7.56914 8.37773 7.48125C8.30391 7.45664 8.23359 7.43203 8.1668 7.41094C7.72383 7.26328 7.48477 6.78516 7.63242 6.34219C7.78008 5.89922 8.2582 5.66016 8.70117 5.80781C8.79258 5.83945 8.87695 5.86758 8.95781 5.8957C9.43594 6.05742 9.78047 6.17344 10.1496 6.1875C10.4309 6.19805 10.6805 6.13125 10.8246 6.04336C10.8914 6.00117 10.923 5.96602 10.9371 5.94141C10.9512 5.92031 10.9688 5.87812 10.9652 5.79727V5.79023C10.9652 5.75508 10.9652 5.71641 10.8246 5.62852C10.6242 5.50195 10.3219 5.40352 9.87187 5.26641L9.80508 5.24531C9.42539 5.13281 8.92617 4.98164 8.52539 4.73906C8.05078 4.4543 7.59375 3.96562 7.59023 3.18867C7.58672 2.38359 8.04375 1.83164 8.56406 1.52227C8.78906 1.38867 9.03164 1.29727 9.27422 1.23398V0.84375C9.27422 0.376172 9.65039 0 10.118 0C10.5855 0 10.9617 0.376172 10.9617 0.84375H10.9688ZM19.9758 11.823C20.4363 12.4488 20.3027 13.3277 19.677 13.7883L15.2262 17.0684C14.4035 17.673 13.4121 18 12.3891 18H6.75H1.125C0.502734 18 0 17.4973 0 16.875V14.625C0 14.0027 0.502734 13.5 1.125 13.5H2.41875L3.99727 12.2344C4.79531 11.5945 5.78672 11.25 6.80977 11.25H9.5625H10.125H12.375C12.9973 11.25 13.5 11.7527 13.5 12.375C13.5 12.9973 12.9973 13.5 12.375 13.5H10.125H9.5625C9.25313 13.5 9 13.7531 9 14.0625C9 14.3719 9.25313 14.625 9.5625 14.625H13.8023L18.0105 11.5242C18.6363 11.0637 19.5152 11.1973 19.9758 11.823ZM6.80625 13.5H6.77461C6.78516 13.5 6.7957 13.5 6.80625 13.5Z" fill="url(#paint0_linear_113_653)"/>
              </g>
              <defs>
              <linearGradient id="paint0_linear_113_653" x1="10.1249" y1="0" x2="10.1249" y2="18" gradientUnits="userSpaceOnUse">
              <stop stop-color="white"/>
              <stop offset="1" stop-color={isDonation ? 'white' : '#C9C9C9'}/>
              </linearGradient>
              <clipPath id="clip0_113_653">
              <rect width="20.25" height="18" fill="white"/>
              </clipPath>
              </defs>
              </svg>
            </div>
          </div>
        </div>
        <div className={`${styles.settingsContent}`}>
          {isDonation ? 
            <>
              {
              confettiActive &&
                <div className={`${styles.confettiContainer} ${fadeOutConfetti ? styles.fadeOut : ''}`}>
                  {<Confetti width={300} height={320} />}
                </div>
              }

              <h1 className={styles.settingsHeaderText} style={{marginTop: '10px'}}>Donate</h1>
              <span>
                {donationMessage}
              </span>

              <div className={styles.inputArea}>
                <div className={styles.anonymous}>
                  <input type="checkbox" id={styles.anonymousCheck} onChange={handleCheckboxChange} name="anonymous" value="Anonymous" />
                  <label id={styles.anonymousLabel} for="anonymous">Anonymous?</label>
                </div>
                <div style={{textAlign: 'center'}}>
                  <input
                      type="number"
                      value={donationAmount}
                      id={styles.usernameInput}
                      className={styles.betInput}
                      onChange={e => setDonationAmount(e.target.value)}
                      onKeyDown={handleKeyPressDonation}
                      placeholder="Donation Amount in USD"
                      maxLength={10} // Limits input to 50 characters
                    />
                  <Donate className={styles.setUsernameButton} onClick={donate}/>
                  <br />
                  <span id={styles.showRecentDonations} onClick={() => setShowDonations(!showDonations)}>
                    {
                      showDonations ?
                      "Hide Donations"
                      :
                      "Show Recent Donations"
                    }
                  </span>
                </div>
              </div>

              {showDonations && (
                <div className={styles.recentDonationsContainer}>
                  {Object.entries(groupedDonations).map(([date, donations]) => (
                    <React.Fragment key={date}>
                      <span className={commonStyles.label}>{date}</span>
                      {donations.map((donation, index) => (
                        <motion.div key={index} className={commonStyles.entry}
                        initial={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        >
                          <span>
                            {donation.user_address ? 
                            (donation.username ? donation.username : 
                            donation.user_address.substring(0, 6) + '...' + donation.user_address.substring(donation.user_address.length - 4)) : 
                            'Anonymous'}
                          </span>
                          <span className={commonStyles.entryAmount}>
                            ${parseFloat(donation.donation_amount).toFixed(2)}
                          </span>
                        </motion.div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
                )}
            </>
          :  
          (
            <>
              <h1 className={styles.settingsHeaderText}>Set New Username</h1>
              <span>
                {statusMessage}
              </span>

              <div className={styles.inputArea}>
                <input
                    type="text"
                    value={username}
                    id={styles.usernameInput}
                    className={styles.betInput}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Set new username here..."
                    maxLength={25} // Limits input to 50 characters
                  />
                <Check className={styles.setUsernameButton} onClick={updateUsername}/>
              </div>
            </>
          )
          }
        </div>
      </div>


      <div className={commonStyles.content}>
        <div className={`${commonStyles.info} ${styles.info} ${specialStyle ? styles.special : ''}`}>
          <div className={commonStyles.status}>
            <span className={commonStyles.label}>Status</span>
            <div id={styles.betting} className={`${commonStyles.info_text} ${specialStyle ? styles.special : ''}`}>{gameState.timer > 30 ? 'Betting Open' : 'Betting Closing'}</div>
          </div>
          <hr className={commonStyles.line} />
          <div className={commonStyles.timer}>
            <span className={commonStyles.label}>Timer</span>
            <div id={commonStyles.timer} className={commonStyles.info_text}>{gameState.timer}</div>
            <div id={styles.timer_overlay} className={`${commonStyles.info_text} ${specialStyle ? styles.special : ''}`}>{gameState.timer}</div>
          </div>
        </div>
        <div className={styles.betting}>
          <input
            type="number" 
            onChange={e => setBetAmount(e.target.value)} 
            placeholder="Bet Amount in USD" 
            className={styles.betInput}
            disabled={betPlaced !== -1}
          />
          {!isPlacingBet ? (
            <div className={styles.buttons}>
              <button 
                onClick={() => placeBet(0)}
                disabled={betPlaced !== -1}
                className={`${styles.button} ${styles.red} ${betPlaced === -1 ? styles.canHoverRed : ''} ${betPlaced === 0 ? styles.selected : ''}`}>
                Red
              </button>
              <button 
                onClick={() => placeBet(1)} 
                disabled={betPlaced !== -1} 
                className={`${styles.button} ${styles.black} ${betPlaced === -1 ? styles.canHoverBlack : ''} ${betPlaced === 1 ? styles.selected : ''}`}>
                Black
              </button>
            </div>
          ) : (
            <div id={commonStyles.spinner} className={styles.spinner}>
              <RouletteBack />
              <RouletteSpinning id={commonStyles.spinning} />
            </div>
          )}
          <div className={styles.address}>
            <img src={metamaskLogo} className={styles.mm_logo} alt="MetaMask logo"/>
            {userAddress.substring(0,6) + "..." + userAddress.substring(userAddress.length - 4)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BettingComponent;
