import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from './GameContext'; // Ensure this path is correct
import Logo from './Logo'; // Import the new Logo component
import { ReactComponent as Zero } from './images/0.svg'
import { ReactComponent as Black } from './images/black.svg'
import { ReactComponent as Red } from './images/red.svg'
import { ReactComponent as Arrow } from './images/arrow.svg'
import commonStyles from './CommonStyles.module.css';
import styles from './RouletteComponent.module.css';
import io from 'socket.io-client';
import JoinLateNotice from './JoinLateNotice';

// Define the roulette numbers and their colors
const rouletteNumbers = "3-26-0-32-15-19-4-21-2-25-17-34-6-27-13-36-11-30-8-23-10-5-24-16-33-1-20-14-31-9-22-18-29-7-28-12-35".split('-');
const redNumbers = new Set([32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3]);
const adjustedNumbers = "0-32-15-19-4-21-2-25-17-34-6-27-13-36-11-30-8-23-10-5-24-16-33-1-20-14-31-9-22-18-29-7-28-12-35-3-26".split('-');

// Initialize socket connection
const socket = io('https://localhost:3001', { secure: true });

const calculateTransform = (winningNumber) => {
  const baseTranslation = -9842 - 45; // Base translation for two full rotations
  const findWinning = (element) => element === winningNumber;
  const winningIndex = adjustedNumbers.findIndex(findWinning);
  const additionalTranslation = winningIndex * -133; // Each tile's width, change the number based on your actual tile width
  return baseTranslation + additionalTranslation;
};

function RouletteComponent() {
  const navigate = useNavigate();
  const { gameState, setGameState } = useContext(GameContext);
  const [isLoaded, setIsLoaded] = useState(false); // State to track loading
  const [transformX, setTransformX] = useState(-45);
  const [finishStatus, setfinishStatus] = useState(false);

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
    setIsLoaded(true); // Set to true when component mounts
  }, []);

  useEffect(() => {
    const timerHandler = (data) => {
      console.log('Timer data received:', data);
      setGameState(prevState => ({ ...prevState, outcome: data.game_outcome, timer: data.countdown, stage: data.stage, exchange: data.exchange, total_red: data.total_red, total_black: data.total_black }));
    };

    // Listen for timer updates from server
    socket.on('timer', timerHandler);

    return () => {
      socket.off('timer', timerHandler);
    };
  }, [setGameState, navigate]); // Removed gameState from the dependency array

  useEffect(() => {
    switch (gameState.stage) {
      case 0:
        navigate('/betting')
        break;
      case -1:
      case 1:
      case 2:
        navigate('/transactions');
        break;
      default:
        break;
    }

    if (gameState.timer >= 21) { // Starting the spinning
      const newTransformX = calculateTransform(gameState.outcome);
      setTransformX(newTransformX);
    } else if (gameState.timer <= 21 && gameState.timer > 19) {
      setIsLoaded(false);
    } else if (gameState.timer <= 19) {
      navigate('/outcome');
    }

  }, [gameState, navigate]);

  useEffect(() => {
    setTimeout(() => {
      setRouletteStyle(prevStyle => ({ ...prevStyle, left: `${transformX}px` }));
    }, 1000); // Trigger after a short delay
  }, [transformX]);
  
  const [rouletteStyle, setRouletteStyle] = useState({
    transition: 'left 23s ease-in-out',
    left: '-45px' // Start position
  });

  return (
    <div className={`${commonStyles.container} ${isLoaded ? commonStyles.loaded : ''}`}>
      <div>
        <Logo />
      </div>
      <div className={`${commonStyles.content} ${styles.content}`}>
        <Arrow id={styles.arrow} />
        <div className={styles.rouletteContainer} style={rouletteStyle}>
          {rouletteNumbers.concat(rouletteNumbers).concat(rouletteNumbers).concat(rouletteNumbers).map((number, index) => {
            let TileComponent = number === '0' ? Zero : redNumbers.has(parseInt(number)) ? Red : Black;
            return (
              <div key={index} className={styles.tile}>
                <TileComponent />
                <span id={`${TileComponent === Zero ? styles.zero : redNumbers.has(parseInt(number)) ? styles.red : styles.black}`} className={styles.numberLabel}>{number}</span>
              </div>
            );
          })}
        </div>
      </div>
      {!gameState.has_visited_bet && <JoinLateNotice />}
    </div>
  );
}

export default RouletteComponent;