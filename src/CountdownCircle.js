import React, { useEffect, useState } from 'react';
import styles from './CountdownCircle.module.css';

function CountdownCircle({ duration, onReset }) {
  const [percent, setPercent] = useState(100);
  const [animationPhase, setAnimationPhase] = useState('countdown');

  useEffect(() => {
    let timeoutIds = [];
    const initialWait = 10000;

    const resetAnimation = () => {
      setPercent(100);
      setAnimationPhase('countdown');
      startAnimation();
    };

    const startAnimation = () => {
      const countdownTimeout = setTimeout(() => {
        setPercent(0);
      }, initialWait);
      timeoutIds.push(countdownTimeout);

      const fadeoutTimeout = setTimeout(() => {
        setAnimationPhase('fadeOut');
      }, initialWait + duration);
      timeoutIds.push(fadeoutTimeout);

      const countdownReset = setTimeout(() => {
        setPercent(100);
        onReset();
      }, initialWait + duration + 1000);
      timeoutIds.push(countdownReset);

      const fadeinTimeout = setTimeout(() => {
        setAnimationPhase('fadeIn');
      }, initialWait + duration + 1000 + duration);
      timeoutIds.push(fadeinTimeout);

      const restartTimeout = setTimeout(() => {
        resetAnimation(); // Restart the animation cycle
      }, initialWait + duration + 1000 + duration + 1000);
      timeoutIds.push(restartTimeout);
    };

    startAnimation();

    return () => {
      timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
    };

  // eslint-disable-next-line
  }, []);

  return (
    <div className={styles.countdownContainer}>
      <svg className={styles.countdownCircle} viewBox="0 0 40 40"> {/* Adjusted viewBox dimensions */}
        <defs>
          <linearGradient id="gradientStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#00C2FF', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#CDFFBB', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path
          className={styles.circleBg}
          d="M20 4
            a 16 16 0 0 1 0 32
            a 16 16 0 0 1 0 -32"
          fill="none"
          stroke="#eee"
          strokeWidth="4"
        />
        <path
          className={`${styles.circle} ${animationPhase === 'fadeOut' ? styles.fadeOut : ''} ${animationPhase === 'fadeIn' ? styles.fadeIn : ''}`}
          style={{transitionDuration: `${duration / 1000}s`}}
          stroke="url(#gradientStroke)"
          strokeDasharray={`${percent}, 100`}
          d="M20 4
            a 16 16 0 0 1 0 32
            a 16 16 0 0 1 0 -32"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
  </div>
  );
}

export default CountdownCircle;
