import React, { useState, useEffect } from 'react';
import socketIoClient from 'socket.io-client';
import rouletteContractAbi from './abis/rouletteContractAbi.json';
import styles from './Roulette.module.css';

const contractAddress = "0xfCBA36DB3ED62653b80da3Ab50a074Ae64083C43";
const SOCKET_SERVER_URL = "https://localhost:3001"; // Server URL

function Roulette({ web3 }) {
  const [betAmount, setBetAmount] = useState('');
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [displayTimer, setDisplayTimer] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const contract = new web3.eth.Contract(rouletteContractAbi, contractAddress);
  
  useEffect(() => {
    const socket = socketIoClient(SOCKET_SERVER_URL);
    socket.on('timer', (data) => {
      let displayedTime; // Declare a mutable variable
  
      if (data.stage === 3) {
        if (data.countdown > 20) {
          displayedTime = data.countdown - 20;
          handleStageChange(3); // Spinning roulette
        } else {
          displayedTime = data.countdown; // Last 20 seconds countdown
          handleStageChange(4); // Handle outcome display
          setOutcome(data.game_outcome);
        }
      } else {
        displayedTime = data.countdown; // Normal countdown handling
        handleStageChange(data.stage);
      }
  
      setDisplayTimer(displayedTime);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (outcome !== null) {
      setMessage(`Winning outcome: ${outcome}`);
    }
  }, [outcome]); // This useEffect runs every time 'outcome' changes  
  
  const handleStageChange = (stage) => {
    switch(stage) {
      case 0:
        setMessage('Betting is open.');
        break;
      case 1:
        setMessage('Finalizing transactions.');
        break;
      case 2:
        setMessage('Fetching random number.');
        break;
      case 3:
        setMessage('Spinning roulette.');
        break;
      case 4:
        break;
      default:
        setMessage('');
    }
  };

  const placeBet = async () => {
    if (message !== 'Betting is open.') {
      console.error("Betting is currently closed.");
      setMessage("Betting is currently closed.");
      return;
    }
    try {
      const accounts = await web3.eth.getAccounts();
      const tx = await contract.methods.setBet(guess).send({
        from: accounts[0],
        value: web3.utils.toWei(betAmount, 'ether')
      });
      setMessage('Bet placed successfully!');
    } catch (error) {
      console.error('Error placing bet:', error);
      setMessage('Error placing bet. See console for details.');
    }
  };

  return (
    <div className={styles.roulette}>
      <h1 className={styles.title}>GreenRoulette</h1>
      <p>{message}</p>
      {displayTimer !== null && <p>Timer: {displayTimer} seconds</p>}
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={betAmount}
          onChange={e => setBetAmount(e.target.value)}
          placeholder="Bet Amount in ETH"
          className={styles.input}
          disabled={message !== 'Betting is open.'}
        />
        <input
          type="text"
          value={guess}
          onChange={e => setGuess(e.target.value)}
          placeholder="Your Guess"
          className={styles.input}
          disabled={message !== 'Betting is open.'}
        />
      </div>
      <button onClick={placeBet} className={styles.button} disabled={message !== 'Betting is open.'}>Place Bet</button>
    </div>
  );
}

export default Roulette;

