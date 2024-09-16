import React, { useState, useEffect } from 'react';
import commonStyles from './CommonStyles.module.css';

function JoinLateNotice() {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const intervalId = setInterval(() => {
            setDots(prevDots => {
                const newDots = prevDots.length < 3 ? prevDots + '.' : '';
                return newDots;
            });
        }, 1000); // Change the dot every 1000 milliseconds (1 second)

        return () => clearInterval(intervalId); // Clean up the interval on component unmount
    }, []);

    return (
        <span id={commonStyles.joinLateText} >Please wait for the next round to start{dots}</span>
    );
}

export default JoinLateNotice;
