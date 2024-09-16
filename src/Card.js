// Card.js
import React from 'react';
import styles from './Card.module.css'; // Ensure you have the corresponding CSS module

const Card = ({ logo, alt, description, fontSize, black }) => {
  return (
    <div className={`${styles.card} ${black ? styles.black : styles.red}`}>
      <img src={logo} alt={alt} className={styles.charityLogo} />
      <p style={{ fontSize: fontSize }}>{description}</p>
    </div>
  );
};

export default Card;
