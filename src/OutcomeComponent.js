import React, { useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from './GameContext';
import commonStyles from './CommonStyles.module.css';
import styles from './OutcomeComponent.module.css';
import io from 'socket.io-client';

import CountUp from 'react-countup';
import Confetti from 'react-confetti';  // Import the Confetti component
import { useWindowSize } from 'react-use';  // Import hook to get window size

// Initialize socket connection
const socket = io('https://localhost:3001', { secure: true });

const redNumbers = new Set([32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 12, 3]);
const blackNumbers = new Set([15, 4, 2, 17, 6, 13, 11, 8, 10, 24, 33, 20, 31, 22, 29, 28, 35, 26]);

function OutcomeComponent() {
  const navigate = useNavigate();
  const { gameState, setGameState } = useContext(GameContext);
  const [isLoaded, setIsLoaded] = useState(false); // State to track loading
  const [outcome, setOutcome] = useState(null);
  const { width, height } = useWindowSize();  // Get window size for Confetti

  const [animationPlayed, setAnimationPlayed] = useState(false);
  const valuesRef = useRef({ totalWon: 0, totalDonated: 0, playerWon: 0 });

  useEffect(() => {
    setIsLoaded(true); // Set to true when component mounts
  }, []);

  useEffect(() => {
    const timerHandler = (data) => {
      console.log('Timer data received:', data);
      setGameState(prevState => ({ ...prevState, outcome: data.game_outcome, timer: data.countdown, exchange: data.exchange, stage: data.stage, total_red: data.total_red, total_black: data.total_black }));
    };

    // Listen for timer updates from server
    socket.on('timer', timerHandler);

    return () => {
      socket.off('timer', timerHandler);
    };
  }, [setGameState, navigate]); // Removed gameState from the dependency array

  useEffect(() => {
    if (gameState.timer <= 0) {
      setIsLoaded(false);
    }

    switch (gameState.stage) {
      case 0:
        navigate('/betting');
        break;
      case -1:
      case 1:
      case 2:
        navigate('/transactions');
        break;
      default:
        break;
    }
  }, [gameState, navigate]);

  useEffect(() => {
    // Calculate the outcome when gameState updates
    if (gameState.outcome != null && !animationPlayed) {
      const number = parseInt(gameState.outcome);
      const isRed = redNumbers.has(number);
      const isBlack = blackNumbers.has(number);

      let total_won = 0;
      let donated = 0;

      console.log(number);
      console.log(isRed);
      console.log(isBlack);

      if (isRed) {
        total_won = gameState.total_red;
        donated = gameState.total_black * 0.75;
      } else if (isBlack) {
        total_won = gameState.total_black;
        donated = gameState.total_red * 0.75;
      } else {
        total_won = 0;
        donated = gameState.total_red * 0.75 + gameState.total_black * 0.75;
      }

      console.log(total_won);
      console.log(donated);

      valuesRef.current = {
        totalWon: total_won * gameState.exchange,
        totalDonated: donated * gameState.exchange,
        playerWon: gameState.bet.amount * gameState.exchange
      };

      setAnimationPlayed(true);

      // Determine win or loss
      if (!gameState.bet.placed) {
        setOutcome(2);
      } else if ((gameState.bet.choice === 0 && isRed) || (gameState.bet.choice === 1 && isBlack)) {
        setOutcome(0); // Win
      } else {
        setOutcome(1); // Loss
      }
    }
  }, [gameState, animationPlayed]);

  return (
    <div className={`${commonStyles.container} ${isLoaded ? commonStyles.loaded : ''}`}>
      {outcome === 0 && <Confetti width={width} height={height} />} 
      <div className={`${commonStyles.content} ${styles.content}`}>
        <h1 id={styles.header} className={`${outcome === 0 ? styles.bright : styles.sad}`}>
          {outcome === 0 ? "CONGRATULATIONS!" : (outcome === 1 ? "TRY AGAIN!" : "NO BET DETECTED!")}
        </h1>
        <span id={styles.consolidation}>{outcome === 1 ? "Don't be sad however..." : ""}</span>
        <div className={`${commonStyles.info} ${styles.info}`}>
            <div className={`${commonStyles.status} ${styles.wonInfo}`}>
              <h2 className={styles.title}>
                {outcome === 0 ? "You Won🏆" : (outcome === 1 ? "You Donated🌳*" : "Others Won🏆")}
              </h2>
              <span className={styles.amount}>
                {outcome === 0 ? (
                  <CountUp duration={5} end={valuesRef.current.playerWon} suffix="$" />
                ) : outcome === 1 ? (
                  <CountUp duration={5} end={valuesRef.current.playerWon * 0.75} suffix="$" />
                ) : (
                  <CountUp duration={5} end={valuesRef.current.totalWon} suffix="$" />
                )}
              </span>
            </div>
            <hr className={commonStyles.line} />
            <div className={`${commonStyles.timer} ${styles.donatedInfo}`}>
              <h2 className={styles.title}>Total Donated This Round🌍*</h2>
              <span className={styles.amount}><CountUp duration={10} end={valuesRef.current.totalDonated} suffix="$" /></span>
              <span id={styles.subtext}>* Actual donation amount may be less if future bets decrease pool size.</span>
            </div>
        </div>
        <span id={styles.timer}>Next Round: {gameState.timer}</span>
      </div>
    </div>
  );
}

export default OutcomeComponent;
