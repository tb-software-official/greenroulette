import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from './GameContext'; // Ensure this path is correct
import Logo from './Logo'; // Import the new Logo component
import { ReactComponent as RouletteBack } from './images/roulette_back.svg'
import { ReactComponent as RouletteSpinning } from './images/roulette_spinning.svg'
import commonStyles from './CommonStyles.module.css';
import styles from './TransactionComponent.module.css';
import io from 'socket.io-client';
import JoinLateNotice from './JoinLateNotice';

// Initialize socket connection
const socket = io('https://localhost:3001', { secure: true });

function TransactionComponent() {
  const navigate = useNavigate();
  const { gameState, setGameState } = useContext(GameContext);
  const [specialStyle, setSpecialStyle] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // State to track loading
  const [finishStatus, setfinishStatus] = useState(false);
  const [timeLeft, setTimeLeft] = useState('0'); // Timer state for stage 2
  useEffect(() => {
    const onBackButtonEvent = (e) => {
      e.preventDefault();
      if (!finishStatus) {
          if (window.confirm("You have placed a bet. Are you sure you want to leave? Leaving / refreshing will cause the elements in the page to not reflect you having placed a bet.")) {
              setfinishStatus(true)
              // your logic
              navigate('/');
          } else {
              window.history.pushState(null, null, window.location.pathname);
              setfinishStatus(false)
          }
      }
    }

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

  useEffect(() => {
    const timerHandler = (data) => {
      console.log('Timer data received:', data);
      setGameState(prevState => ({ ...prevState, timer: data.countdown, stage: data.stage, exchange: data.exchange, total_red: data.total_red, total_black: data.total_black }));
    };

    // Listen for timer updates from server
    socket.on('timer', timerHandler);

    return () => {
      socket.off('timer', timerHandler);
    };
  }, [setGameState, navigate]); // Removed gameState from the dependency array

  // Fade-In Animation
  useEffect(() => {
    setIsLoaded(true); // Set to true when component mounts
  }, []);  

  useEffect(() => {
    switch (gameState.stage) {
      case 0:
        navigate('/betting');
        break;
      case 1:
        setSpecialStyle(false);
        break;
      case -1:
      case 2:
        setSpecialStyle(true);
        break;
      case 3:
        if (!isLoaded) {
          navigate('/roulette');
        } else {
          setIsLoaded(false);
          setTimeout(() => navigate('/roulette'), 1000);
        }
        break;
      default:
        break;
    }
  }, [gameState, navigate, isLoaded]);

  useEffect(() => {
    let timerInterval;
    if (gameState.stage === 2 && gameState.timer) {
      // Start the timer interval when in stage 2
      timerInterval = setInterval(() => {
        const currentTime = Math.floor(Date.now() / 1000); // Current UNIX time
        const timeRemaining = gameState.timer + 150 - currentTime; // Calculate remaining time
        console.log(gameState.timer);
        console.log(currentTime);

        if (timeRemaining <= 0) {
          setTimeLeft("0");
          clearInterval(timerInterval);
        } else {
          setTimeLeft(`${timeRemaining}`);
        }
      }, 1000); // Update every second
    } else {
      setTimeLeft('0'); // Default display for other stages
    }

    // Cleanup interval on unmount or when the stage changes
    return () => clearInterval(timerInterval);
  }, [gameState.stage, gameState.timer]);

  return (
    <div className={`${commonStyles.container} ${isLoaded ? commonStyles.loaded : ''}`}>
      <div>
        <Logo />
      </div>
      <div className={commonStyles.content}>
        <div className={`${commonStyles.info} ${styles.info} ${specialStyle ? styles.special : ''}`}>
            <div className={`${commonStyles.status} ${styles.status}`}>
              <span className={commonStyles.label}>Status</span>
              <div id={styles.status_text} className={`${commonStyles.info_text} ${styles.info_text} ${specialStyle ? styles.special : ''}`}>Finalizing Transactions</div>
              <div id={styles.status_text_overlay} className={`${commonStyles.info_text} ${styles.info_text} ${specialStyle ? styles.special : ''}`}>
                {gameState.stage === 2 || gameState.stage === 3 ? "Fetching Random Number" : "No bets! Resetting."}
              </div>
            </div>
            <hr className={commonStyles.line} />
            <div className={`${commonStyles.timer} ${styles.timer}`}>
              <span className={commonStyles.label}>Timer</span>
              <div className={`${styles.countdown} ${commonStyles.info_text}`}>{gameState.stage === 1 || gameState.stage === -1 ? (gameState.timer > 120 ? 0 : gameState.timer) : timeLeft}</div>
            </div>
        </div>
        <div id={commonStyles.spinner}>
          <RouletteBack />
          <RouletteSpinning id={commonStyles.spinning} />
        </div>
      </div>
      {!gameState.has_visited_bet && <JoinLateNotice />}
    </div>
  );
}

export default TransactionComponent;
