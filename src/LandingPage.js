// LandingPage.js
import React, { useEffect, useState, useRef } from 'react';
import styles from './LandingPage.module.css'; // Import CSS module for styles
import commonStyles from './CommonStyles.module.css'; // Import CSS module for styles
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ReactComponent as Logo } from './images/logo.svg';
import { ReactComponent as BackCoin } from './images/landing_visual/Back_Coin.svg';
import { ReactComponent as Earth } from './images/landing_visual/Earth.svg';
import { ReactComponent as MiddleCoin } from './images/landing_visual/Middle_Coin.svg';
import { ReactComponent as FrontCoin } from './images/landing_visual/Front_Coin.svg';
import { ReactComponent as Hearts } from './images/landing_visual/Hearts.svg';
import { ReactComponent as Medal1 } from './images/Medal.svg';
import { ReactComponent as Medal2 } from './images/Medal_2.svg';
import { ReactComponent as Medal3 } from './images/Medal_3.svg';
import { ReactComponent as Mail } from './images/mail.svg';
import { ReactTyped } from "react-typed";

import axios from 'axios';

import GDLogo from './images/givedirectly_logo.png';
import STCLogo from './images/save_the_children_logo.png';
import ODALogo from './images/oda_logo.png';
import PFLogo from './images/pathforward_logo.png';
import TFTFLogo from './images/trees_for_the_future_logo.png';
import ZFLogo from './images/zerofoodprint_logo.jpeg';
import AFWLogo from './images/acts_for_water_logo.png';
import ethereumLogo from './images/ethereum_logo.png';
import xLogo from './images/x_logo.png';

import Card from './Card';

import CountdownCircle from './CountdownCircle';

// Create an instance of axios with a base URL
const database_api = axios.create({
  baseURL: 'http://localhost:6969/'
});

function LandingPage() {
  const [animate, setAnimate] = useState(false);

  const navigate = useNavigate();

  const phrases = [
    "the Planet",
    "Education",
    "the Future",
    "the Children",
    "the Community",
    "the Environment",
    "Well-being",
    "Hope",
    "Change",
    "Sustainability",
    "Growth",
    "Harmony",
    "Unity",
    "Prosperity"
  ];

  const allCharities = [
    { logo: STCLogo, alt: 'Charity Logo', fontSize: '16px', black: true, description: 'Save the Children is passionately committed to one goal: Giving all children the best chance for the future they deserve – a healthy start in life, to be protected from harm and the opportunity to learn. Every day, in times of crisis, here in the U.S. and in more than 110 countries around the world, they do whatever it takes to reach the most vulnerable children and their families. ' },
    { logo: GDLogo, alt: 'Charity Logo', fontSize: '16px', black: false, description: 'GiveDirectly is a nonprofit that lets donors send money directly to the world’s poorest households. In doing so, they aim to accelerate the end of extreme poverty globally. They believe people living in poverty deserve the dignity to choose for themselves how best to improve their lives — cash enables that choice.' },
    { logo: TFTFLogo, alt: 'Charity Logo', fontSize: '13px', black: true, description: 'Around the world, modern and industrialized farming practices are destroying the environment—and, at the same time, failing to provide reliable income and nourishment for the farmers we all depend on to survive. At Trees for the Future (TREES), they recognize that unsustainable land use is the root cause of our most pressing challenges. They confront these challenges by serving the people at the heart of our global food systems: farmers and their families. They provides hands-on, immersive education, skill building, and support, encouraging farmers to work with nature, not against it.' },
    { logo: ODALogo, alt: 'Charity Logo', fontSize: '20px', black: false, description: 'Operating from ship and shore, ODA\'s all-volunteer boat and dive crews remove abandoned fishing nets, traps, lines, plastic, and other man-made debris threatening ocean wildlife and habitats.' },
    { logo: AFWLogo, alt: 'Charity Logo', fontSize: '13px', black: true, description: 'The gift of clean water can mean the end of hours of long walks to and from the swamp for dirty, disease filled water. It means lifting families out of a cycle of poverty, it means removing the barriers that rob girls of the chance to earn an education and it gives a community the chance to thrive. This is what Acts For Water does. They provide clean accessible water to those in desperate need. Acts for Water is one of Canada’s oldest charities who partners with an all local Ugandan team to build the most sustainable water solution in the world.' },
    { logo: PFLogo, alt: 'Charity Logo', fontSize: '18px', black: false, description: 'PathForward’s mission is to transform lives by delivering housing solutions and pathways to stability. PathForward’s vision is an inclusive and equitable community where all neighbors live stable, secure, and independent lives free from the threat of homelessness. ' },
    { logo: ZFLogo, alt: 'Charity Logo', fontSize: '13px', black: true, description: 'Zero Foodprint is changing the way food is grown to restore the climate. They fund carbon farming projects through their Restore grant program. Their values include regeneration, collective action, justice and prosperity. Regeneration is the idea that with regenerative agriculture, we can not only slow but reverse climate change by drawing carbon into the soil and restoring natural ecosystems. Their work provides a renewable economic system giving businesses, and thus their patrons, an easy way to fund climate solutions. ' },
  ];

  const [cards, setCards] = useState(allCharities.slice(0, 2));  // Start with the first two cards
  const toAddRef = useRef(2);
  
  // Ensure updateCards is defined with useCallback
  const updateCards =() => {
    const newCardIndex = toAddRef.current;
    const newCard = allCharities[newCardIndex];
 
    setCards(currentCards => [...currentCards, newCard]);
    setAnimate(true); // Trigger animation

    // Update the current index
    toAddRef.current = (newCardIndex + 1) % allCharities.length;
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (animate) {
        setAnimate(false);
        setCards(currentCards => currentCards.slice(1));
      }
    }, 5000);
  
    return () => clearTimeout(timeout);
  }, [animate]);

  const [topDonators, setTopDonators] = useState([]);

  useEffect(() => {
    const fetchTopDonators = async () => {
      try {
        const response = await database_api.get('/api/top-donators');
        setTopDonators(response.data);
      } catch (error) {
        console.error('Failed to fetch top donators:', error);
      }
    };

    fetchTopDonators();
  }, []);

  const [topWinners, setTopWinners] = useState([]);

  useEffect(() => {
    const fetchTopWinners = async () => {
      try {
        const response = await database_api.get('/api/top-winners');
        setTopWinners(response.data);
      } catch (error) {
        console.error('Failed to fetch top winners:', error);
      }
    };

    fetchTopWinners();
  }, []);

  const [totalDonated, setTotalDonated] = useState(0);

  useEffect(() => {
    const fetchTotalDonated = async () => {
      try {
        const response = await database_api.get('/api/total_donated');
        setTotalDonated(response.data[0].total_amount);
      } catch (error) {
        console.error('Failed to fetch total donated:', error);
      }
    };

    fetchTotalDonated();
  }, []);

  const page2Ref = useRef(null);
  const page3Ref = useRef(null);

  const scrollToSection = (sectionRef) => {
    sectionRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const fadeInRef1 = useRef(null);
  const fadeInRef2 = useRef(null);
  const [page2Visible, setPage2Visible] = useState(false);
  const [page3Visible, setPage3Visible] = useState(false);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target === fadeInRef1.current) {
            setPage2Visible(true);
          } else if (entry.target === fadeInRef2.current) {
            setPage3Visible(true);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const currentFadeInRef1 = fadeInRef1.current;
    const currentFadeInRef2 = fadeInRef2.current;

    if (currentFadeInRef1) observer.observe(currentFadeInRef1);
    if (currentFadeInRef2) observer.observe(currentFadeInRef2);

    return () => {
      if (currentFadeInRef1) observer.unobserve(currentFadeInRef1);
      if (currentFadeInRef2) observer.unobserve(currentFadeInRef2);
    };
  }, []);

  const [showTopDonators, setShowTopDonators] = useState(true); // State to toggle leaderboards

  // Effect to toggle leaderboards every 10 seconds on small screens
  useEffect(() => {
    const toggleInterval = setInterval(() => {
      setShowTopDonators((prev) => !prev); // Toggle state
    }, 5000); // 5 seconds

    return () => clearInterval(toggleInterval); // Clean up interval on unmount
  }, []);

  return (
    <>
      <div className={styles.page1}>
        <div className={styles.header}>
          <Logo />
          <div className={styles.buttonGroup}>
            <button onClick={() => navigate('/explanation.pdf')}>How it Works 📈</button>
            <button onClick={() => scrollToSection(page2Ref)}>Charities 🌍</button>
            <button onClick={() => scrollToSection(page3Ref)}>Leaderboards 🏆</button>
          </div>
        </div>
        <div className={styles.main}>
          <div className={styles.info}>
            <p className={styles.slogan}>Play for {" "}
            <span id={styles.distinguish}><ReactTyped strings={phrases} typeSpeed={150} backSpeed={50} backDelay={3000} showCursor={false} loop /></span></p>
            <p className={styles.infoText}>
              Welcome to GreenRoulette, where every spin is a chance to win and 
              an opportunity to help. At GreenRoulette, we believe in entertainment 
              that cares. That's why we commit <b>67%</b> of all profits to support various 
              charities. With <span className={styles.donationAmount}>${parseFloat(totalDonated)}</span> already donated, join us in our mission to give 
              back. Ready to place your bets?
            </p>
            <button id={styles.startPlaying} onClick={() => {navigate('/getting-started?redirect=betting')}}>Start Playing 🚀</button>
            <button id={styles.becomePartner} onClick={() => {navigate('/getting-started?redirect=partner')}}>Become a Partner 💸</button>
          </div>
          <div className={styles.visual}>
            <div className={styles.elements}>
                <BackCoin className={styles.backCoin}/>
                <Earth className={styles.earth}/>
                <MiddleCoin className={styles.middleCoin}/>
                <FrontCoin className={styles.frontCoin}/>
                <Hearts className={styles.hearts}/>
            </div>
          </div>
        </div>
      </div>
      <div className={`${styles.page2} ${page2Visible ? styles.fadeIn : ''}`} ref={page2Ref}>
        <div className={styles.wrapper}>
          <div className={styles.cardContainer} ref={fadeInRef1}>
            <div className={styles.cardWrapper}>
              <div className={`${styles.cards} ${animate ? styles.goLeftAnimation : ''}`}>
                {cards.map((card, index) => (
                  <Card 
                    key={index}
                    logo={card.logo} 
                    alt={card.alt} 
                    description={card.description} 
                    fontSize={card.fontSize} 
                    black={card.black} 
                  />
                ))}
              </div>
            </div>
            <CountdownCircle duration={10000} onReset={updateCards} />
            <MiddleCoin className={styles.middleCoin2}/>
            <FrontCoin className={styles.frontCoin2}/>
            <Hearts className={styles.hearts2}/>
          </div>
        </div>

        <div className={styles.charitySectionInfo}>
          <h1 className={styles.sectionHeader}>Our Partners for Change</h1>
          <span id={styles.charityInfo} className={styles.infoText}>
            We want to make a difference with every
            spin. That's why we are proud to partner with a diverse range of 
            non-profit organizations dedicated to creating a better world. 
            Together, we're turning fun into meaningful action, ensuring that 
            every game played  contributes to a brighter, more sustainable 
            future for all. Join us in supporting these incredible causes and be a
            part of something bigger.
        </span>
        </div>
      </div>
      <div className={`${styles.page3} ${page3Visible ? styles.fadeIn : ''}`} ref={page3Ref}>
        <h1 className={styles.sectionHeader} style={{color: 'white'}}><span id={styles.topDonator}>Top Donators</span> and <span id={styles.champion}>Champions</span></h1>
        
        <span className={styles.leaderboardText} ref={fadeInRef2}>
          Explore the GreenRoulette Leaderboards to see the community's top contributors and winners. 
          Whether it's the highest donations or the most successful spins, this is where our most dedicated 
          players shine. Join the ranks, make your mark, and see how you compare to the best!
        </span>
        
       {page3Visible && <div className={styles.leaderboards}>
          <div className={`${commonStyles.popUpContainer} ${styles.leaderboard}`}
          style={{
            opacity: showTopDonators ? 1 : 0,
            transition: 'opacity 1s', // Add fade transition
          }}>
              <div className={`${commonStyles.popUpHeader} ${styles.leaderboardHeader}`}>
                <span className={styles.leaderboardHeaderText}>Top Donators 🌍</span>
              </div>

              {topDonators.slice(0, 3).map((donator, index) => (
                <motion.div
                  key={donator.address}
                  className={styles.topEntry}
                  initial={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                >
                  {index === 0 ? <Medal1 className={styles.medal} /> :
                   index === 1 ? <Medal2 className={styles.medal} /> :
                   <Medal3 className={styles.medal} />}
                  <div className={styles.entryInfo}>
                    <span className={styles.entryAddress}>
                      {donator.username || 
                       (donator.address.substring(0, 6) + '...' + donator.address.substring(donator.address.length - 4))}
                    </span>
                    <br />
                    <span className={`${styles.entryAmount} ${index === 0 && styles.top}`}>
                      {parseFloat(donator.total_donated)}
                      <img src={ethereumLogo} alt="ETH" className={styles.ethLogo} />
                    </span>
                  </div>
                </motion.div>
              ))}

              <div className={styles.regularEntries}>
              {topDonators.map((donator, index) => (
                <>
                {
                  index > 2 &&
                  <>
                    <motion.div
                    key={donator.address} className={`${commonStyles.entry} ${styles.entry}`}
                    initial={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 + index * 0.2 }}
                    >
                      <span>
                        {index + 1}. {donator.username ? donator.username : 
                        (donator.address.substring(0, 6) + '...' + donator.address.substring(donator.address.length - 4))}
                      </span>
                      <span className={`${commonStyles.entryAmount} ${styles.regularAmount}`}>
                        {parseFloat(donator.total_donated)}
                        <img src={ethereumLogo} alt="ETH" className={styles.ethLogo} />
                      </span>
                    </motion.div>
                  </>
                }
                </>
              ))}
              </div>
          </div>

          <div className={`${commonStyles.popUpContainer} ${styles.leaderboard}`}
          style={{
            opacity: showTopDonators ? 0 : 1,
            position: 'relative',
            left: '-404px',
            transition: 'opacity 1s', // Add fade transition
          }}>
              <div className={`${commonStyles.popUpHeader} ${styles.leaderboardHeader} ${styles.winner}`}>
                <span className={styles.leaderboardHeaderText}>Top Winners 🏆</span>
              </div>

              {topWinners.map((winner, index) => (
                <>
                  {index <= 2 &&
                    <motion.div className={styles.topEntry}
                    initial={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    >
                      {index === 0 ? <Medal1 className={styles.medal} /> :
                      index === 1 ? <Medal2 className={styles.medal} /> :
                      index === 2 ? <Medal3 className={styles.medal} /> : null}
                      <div className={styles.entryInfo}>
                        <span className={styles.entryAddress}>
                          {winner.username ? winner.username : 
                          (winner.address.substring(0, 6) + '...' + winner.address.substring(winner.address.length - 4))}
                        </span>
                        <br />
                        <span className={`${styles.entryAmount} ${index === 0 && styles.top}`}>
                          {parseFloat(winner.total_win)}
                          <img src={ethereumLogo} alt="ETH" className={styles.ethLogo} />
                        </span>
                      </div>
                    </motion.div>
                  }
                </>
              ))}

              <div className={styles.regularEntries}>
              {topWinners.map((winner, index) => (
                <>
                {
                  index > 2 &&
                  <>
                    <motion.div className={`${commonStyles.entry} ${styles.entry}`}
                    initial={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 + index * 0.2 }}
                    >
                      <span>
                        {index + 1}. {winner.username ? winner.username : 
                        (winner.address.substring(0, 6) + '...' + winner.address.substring(winner.address.length - 4))}
                      </span>
                      <span className={`${commonStyles.entryAmount} ${styles.regularAmount}`}>
                        {parseFloat(winner.total_win)}
                        <img src={ethereumLogo} alt="ETH" className={styles.ethLogo} />
                      </span>
                    </motion.div>
                  </>
                }
                </>
              ))}
              </div>
          </div>
        </div>}
      </div>
      <div className={styles.footbar}>
        <Logo />

        <div className={styles.buttonGroup}>
            <button className={styles.footbarButton}><Mail /></button>
            <button className={styles.footbarButton}><img src={xLogo} alt="X logo" /></button>
          </div>
      </div>
    </>
  );
}

export default LandingPage;
