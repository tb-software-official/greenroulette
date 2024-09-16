import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

import styles from './Chat.module.css';
import commonStyles from './CommonStyles.module.css'

import { ReactComponent as GRChat } from './images/gr_chat.svg'
import { ReactComponent as Send } from './images/send.svg'
import { GameContext } from './GameContext';
import logo from './images/logo.svg';

const socket = io('http://localhost:3002');
const timer = io('https://localhost:3001', { secure: true });

timer.on('connect', () => {
  console.log('Connected to the server');
});

// Create an instance of axios with a base URL
const database_api = axios.create({
  baseURL: 'http://localhost:6969/'
});

const roundTwoDecimals = (number) => {
  return Math.round((number + Number.EPSILON) * 100) / 100
};

function Chat({ setIsChatOpen, isChatOpen, setUnreadCounter }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { gameState } = useContext(GameContext);
  const { userAddress, bet, exchange, total_red, total_black } = gameState;
  const [username, setUsername] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isPartner, setIsPartner] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Fetch the username when the component mounts
    const fetchUsername = async () => {
      if (userAddress) {
        try {
          const response = await database_api.get(`/api/get_username/${userAddress}`);
          if (response.data.username) {
            setUsername(response.data.username);
          }
        } catch (error) {
          console.error('Failed to fetch username:', error);
        }
      }
    };

    fetchUsername();
  }, [userAddress]);

  const checkIfPartner = useCallback(async () => {
    try {
      const response = await database_api.get('/api/get_all_partners');
      const partners = response.data.partners;
      const isPartner = partners.some(partner => partner.address && userAddress && partner.address.toLowerCase() === userAddress.toLowerCase());
      setIsPartner(isPartner);
    } catch (error) {
      console.error('Error checking if user is partner:', error);
    }
  }, [userAddress]);

  useEffect(() => {
    checkIfPartner();
  }, [checkIfPartner, userAddress]);

  useEffect(() => {
    const messageHandler = (message) => {
      if (!isChatOpen) setUnreadCounter(prevCounter => prevCounter + 1);

      setMessages(prev => [...prev, message]);
    };

    const onlineUsersHandler = (count) => {
      setOnlineUsers(count);
    };

    socket.on('message', messageHandler);
    socket.on('onlineUsers', onlineUsersHandler);

    // Cleanup on component unmount
    return () => {
      socket.off('message', messageHandler);
      socket.off('onlineUsers', onlineUsersHandler);
    };
  }, [isChatOpen, messages, setUnreadCounter]);

  // Get game state information
  useEffect(() => {
      const timerHandler = (message) => {
        // Format the special message for display
        const specialMessage = {
          text: ` just put ${roundTwoDecimals(message.betAmount * message.betExchange)} USD on ${message.betChoice === 0 ? "Red" : "Black"}!`,
          user: message.user,
          name: message.name,
          type: 'bet',
          incomingBetChoice: message.betChoice
        };
        setMessages(prev => [...prev, specialMessage]);
      };
  
      // Listen for timer updates from server
      timer.on('special bet message', timerHandler);
  
      return () => {
        timer.off('special bet message', timerHandler);
      };
    }, []);

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && input.trim()) {
      sendMessage();
      event.preventDefault(); // Prevent the default action to avoid a form submit behavior
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      if (messagesEndRef.current.scrollTop >= messagesEndRef.current.scrollHeight - 400)
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() && input.length <= 200) {
      socket.emit('send message', userAddress, username, bet.choice, bet.amount, input, isPartner);
      setInput('');
    }
  };

  const handleCloseChat = () => {
    setUnreadCounter(0);
    setIsChatOpen(false);
  };

  return (
    <div className={`${commonStyles.popUpContainer} ${styles.chatContainer} ${isChatOpen ? styles.open : styles.closed}`}>
      <div className={`${commonStyles.popUpHeader} ${styles.chatHeader}`}>
        <GRChat id={styles.logo} />
        <span id={commonStyles.x} onClick={handleCloseChat}>✕</span>
      </div>
      <div className={styles.chatTotalBets}>
        <div className={styles.totalRed}>
          <span id={styles.labelRed}>Total Red</span>
          <br />
          {roundTwoDecimals(total_red * exchange)} $
        </div>
        <div className={styles.totalBlack}>
        <span id={styles.labelBlack}>Total Black</span>
        <br />
        {roundTwoDecimals(total_black * exchange)} $
        </div>
      </div>
      <div className={styles.messages} ref={messagesEndRef}>
        <div key={-1} className={`${styles.message}`}>
          <span id={styles.userInfo}>
          <img  src={logo} id={styles.logoSmall} alt="GreenRoulette"/>
          </span>
          <br />
          <div className={styles.messageContent}>
            Welcome to GreenRoulette Chat! 🌍💬
            {isChatOpen}
            <br />
            <br />
            We’re thrilled to have you here. Get ready to connect with other players in real-time! Before you dive into chatting, here are a few rules to keep in mind:
            <br />
            <ul>
              <li>Be Respectful: Treat everyone with respect. Abusive language, harassment, and discrimination are not tolerated.</li>
              <li>Stay on Topic: Please keep conversations relevant to the game and betting.</li>
              <li>No Spamming: Avoid repetitive messages and flooding the chat. Let everyone have a chance to speak.</li>
              <li>Privacy Matters: Don’t share personal information or ask for others' personal details.</li>
              <li>Remember, violating these rules can lead to a timeout or ban from chat. Let’s create a positive and enjoyable environment for everyone!</li>
            </ul>
            FYI: There are currently {onlineUsers} players online.
            <br />
            <br />
            Happy Chatting! 🚀
          </div>
        </div>

        {messages.map((msg, index) => (
          <div key={index} className={`${styles.message} ${msg.user === userAddress ? styles.you : ''}`}>
            {
            msg.type !== 'bet' ?
            <>
              <span id={styles.userInfo}>
                <span className={msg.isPartner ? styles.partner : ''}>
                  {msg.user === userAddress ? "You " :
                  !msg.name ?
                  msg.user.substring(0,6) + "..." + msg.user.substring(userAddress.length - 4) + " " : 
                  msg.name + " "
                  }
                </span>

                <span style={{ color: msg.betChoice !== null ? (msg.betChoice === 0 ? '#CA0000' : "#171717") : 'gray' }}>
                  {msg.betChoice !== null ?
                    `(${roundTwoDecimals(msg.betAmount * exchange)} USD, ${(msg.betChoice === 0 ? 'Red' : "Black")})` :
                    "(No Bet)"
                  }
                </span>
              </span>
              <br />
            </> :
            ''
            }
            <div className={`
            ${styles.messageContent} 
            ${msg.user === userAddress ? styles.you : ''}
            ${msg.type === 'bet' ? styles.betMessage : ''}
            ${msg.incomingBetChoice === 0 ? styles.guessRed : styles.guessBlack }
            `}>
              {
              msg.type === 'bet' ? 
              (msg.user.toLowerCase() === userAddress ? 
              "You " + msg.text : 
              (!msg.name ?
                msg.user.substring(0,6) + "..." + msg.user.substring(userAddress.length - 4) + " " : 
                msg.name + " ") + msg.text)
              : msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.inputArea}>
      <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message here..."
          maxLength={200} // Limits input to 200 characters
        />
        <Send id={styles.send} onClick={sendMessage}/>
      </div>
    </div>
  );
}

export default Chat;
