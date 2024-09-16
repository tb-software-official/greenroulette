// Logo.js
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as LogoSvg } from './images/logo.svg';
import commonStyles from './CommonStyles.module.css'; // Your common styles
import { GameContext } from './GameContext'; // Import the GameContext

const Logo = () => {
  const navigate = useNavigate();
  const { gameState } = useContext(GameContext); // Access the game state

  const handleLogoClick = () => {
    if (gameState.bet.placed) {
      const confirmation = window.confirm(
        'You have placed a bet. Are you sure you want to leave? Leaving / refreshing will cause the elements in the page to not reflect you having placed a bet.'
      );
      if (!confirmation) {
        return; // Cancel navigation if the user does not confirm
      }
    }
    navigate('/'); // Navigate to the landing page
  };

  return (
    <LogoSvg 
      className={commonStyles.logo} 
      onClick={handleLogoClick} 
      style={{ cursor: 'pointer' }} // Ensure the cursor changes to a pointer to indicate a clickable element
    />
  );
};

export default Logo;
