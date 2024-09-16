// BecomePartner.js
import React, { useEffect, useState, useCallback } from 'react';
import styles from './BecomePartner.module.css'; // Import CSS module for styles
import commonStyles from './CommonStyles.module.css'; // Import CSS module for styles
import { useNavigate } from 'react-router-dom';
import { ReactComponent as Logo } from './images/logo.svg';
import { ReactComponent as Mail } from './images/mail.svg';
import { ReactComponent as Explanation } from './images/explaination.svg';
import rouletteContractAbi from './abis/rouletteContractAbi.json';
import axios from 'axios';

import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

import ethereumLogo from './images/ethereum_logo.png';
import xLogo from './images/x_logo.png';

const contractAddress = "0xa390Afb2bA2e7c4bFfddCB8Fb0b3d9e51a11FeD0";

// Create an instance of axios with a base URL
const database_api = axios.create({
  baseURL: 'https://localhost:6969/'
});

ChartJS.register(ArcElement, Tooltip, Legend);

function PartnerSharePieChart({ userShare }) {
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    database_api.get('/api/get_all_partners')
      .then(response => {
        setPartners(response.data.partners);
      })
      .catch(error => console.error('Error fetching partners:', error));
  }, []);

  const data = {
    labels: ['You', ...partners.map(partner => partner.address.slice(0, 6) + '...' + partner.address.slice(-4))],
    datasets: [
      {
        data: [userShare, ...partners.map(partner => partner.contribution)],
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return null;
          }
          if (context.dataIndex === 0) {
            // Gradient for 'Your Share'
            const gradient1 = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient1.addColorStop(0, '#FF7676');
            gradient1.addColorStop(1, '#FFCF54');
            return gradient1;
          } else {
            // Gradient for 'Other Partners'
            const gradient2 = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient2.addColorStop(0, '#171717');
            gradient2.addColorStop(1, '#D0D0D0');
            return gradient2;
          }
        },
        hoverBackgroundColor: ['#FFCF54', ...Array(partners.length).fill('#171717')],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    tooltips: {
      callbacks: {
        label: function(tooltipItem, data) {
          const dataset = data.datasets[tooltipItem.datasetIndex];
          const total = dataset.data.reduce((acc, current) => acc + current, 0);
          const currentValue = dataset.data[tooltipItem.index];
          const percentage = ((currentValue / total) * 100).toFixed(2);
          return `${data.labels[tooltipItem.index]}: ${currentValue} ETH (${percentage}%)`;
        }
      }
    }
  };
  
  return <Pie data={data} options={options} />;
}


function BecomePartner({ web3 }) {
  const navigate = useNavigate();

  // Move this useEffect to the top of your component
  useEffect(() => {
    if (!web3) {
      navigate('/getting-started');
    }
  }, [web3, navigate]);

  const [contributionAmount, setContributionAmount] = useState('');
  const [userShare, setUserShare] = useState(0);
  const [sharePercentage, setSharePercentage] = useState(0);
  const [estimatedMonthlyEarnings, setEstimatedMonthlyEarnings] = useState(0);
  const [isAlreadyPartner, setIsAlreadyPartner] = useState(-1);
  const [earningsOverTime, setEarningsOverTime] = useState({
    threeMonths: 0,
    sixMonths: 0,
    oneYear: 0,
    twoYears: 0
  });
  const [warningMessage, setWarningMessage] = useState('');

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default form submission behavior
      calculateEarnings();
    }
  };

  const handleContributionChange = (e) => {
    setContributionAmount(e.target.value);
  };

  // Move the contract initialization inside a useEffect
  const [contract, setContract] = useState(null);

  useEffect(() => {
    if (web3) {
      const newContract = new web3.eth.Contract(rouletteContractAbi, contractAddress);
      setContract(newContract);
    }
  }, [web3]);

  const [poolSize, setPoolSize] = useState('0');
  const [partnerCount, setPartnerCount] = useState('0');
  const [totalContributions, setTotalContributions] = useState('0');
  const [totalRewards, setTotalRewards] = useState('0');

  const fetchContractData = useCallback(async () => {
    if (contract && web3) {
      try {
        const [poolSize, partnerCount, totalContributions, totalRewards] = await Promise.all([
          contract.methods.viewPool().call(),
          contract.methods.getNumberOfPartners().call(),
          contract.methods.getTotalPartnerContributions().call(),
          contract.methods.getTotalRewardsDistributedToPartners().call()
        ]);

        setPoolSize(Number(parseFloat(web3.utils.fromWei(poolSize, 'ether')).toPrecision(3)));
        setPartnerCount(Number(partnerCount));
        setTotalContributions(web3.utils.fromWei(totalContributions, 'ether'));
        setTotalRewards(Number(parseFloat(web3.utils.fromWei(totalRewards, 'ether')).toPrecision(3)));
      } catch (error) {
        console.error('Error fetching contract data:', error);
      }
    }
  }, [contract, web3]);

  useEffect(() => {
    if (web3 && contract) {
      fetchContractData();
    }
  }, [web3, contract, fetchContractData]);

  const handleBecomePartner = async () => {
    if (!web3 || !contract || !contributionAmount) {
      alert('Please connect your wallet and enter a contribution amount.');
      return;
    }

    try {
      const accounts = await web3.eth.getAccounts();
      const account = accounts[0];

      // Convert contribution amount from ETH to Wei
      const contributionWei = web3.utils.toWei(contributionAmount, 'ether');

      // Call the becomePartner function in the smart contract
      await contract.methods.becomePartner().send({
        from: account,
        value: contributionWei
      });

      // Update the partner contribution in the database
      const response = await database_api.post('/api/set_partner_contribution', { 
        address: account, 
        contribution: contributionAmount 
      });
      if (response.data.message === 'Partner contribution updated successfully') {
        alert('Congratulations! You are now a partner.');
        fetchContractData();
      } else {
        alert('There was an error while processing your request. Please try again.');
      }
    } catch (error) {
      console.error('Error becoming a partner:', error);
      alert('There was an error while processing your request. Please try again.');
    }
  };

  const calculateEarningsOverTime = (months, newSharePercentage) => {
    let currentPoolSize = parseFloat(poolSize) + parseFloat(contributionAmount);
  
    let totalEarnings = 0;
    let monthlyShare = newSharePercentage / 100;
  
    for (let i = 0; i < months; i++) {
      let monthlyEarning = currentPoolSize * 0.01 * monthlyShare;
      totalEarnings += monthlyEarning;
      currentPoolSize *= 0.94; // Decrease pool size by 6%
    }
  
    return Number(totalEarnings.toPrecision(3));
  };

  const checkPoolSizeVsContribution = (months) => {
    let currentPoolSize = parseFloat(poolSize) + parseFloat(contributionAmount);
    let originalContribution = parseFloat(contributionAmount);

    for (let i = 0; i < months; i++) {
      currentPoolSize *= 0.94; // Decrease pool size by 6%
      
      if (currentPoolSize < originalContribution) {
        return i + 1; // Return the number of months it took for pool size to become smaller
      }
    }

    return -1; // Pool size remains larger than original contribution for the entire period
  };

  const calculateEarnings = async () => {
    try {
      const response = await database_api.get('/api/get_all_partners');
      const accounts = await web3.eth.getAccounts();
      const account = accounts[0];

      let userIsPartner = false;
      for (const partner of response.data.partners) {
        if (partner.address.toLowerCase() === account.toLowerCase()) {
          userIsPartner = true;
          break;
        }
      }

      setIsAlreadyPartner(userIsPartner ? 1 : 0);

      if (!userIsPartner) {
        const response = await database_api.get('/api/get_all_partners');
        const totalContributions = response.data.partners.reduce((sum, partner) => sum + partner.contribution, 0) + parseFloat(contributionAmount);
        const newSharePercentage = (parseFloat(contributionAmount) / totalContributions) * 100;
        setSharePercentage(newSharePercentage);

        const monthlyEarnings = 0.01 * (parseFloat(poolSize) + parseFloat(contributionAmount)) * (newSharePercentage / 100);
        setEstimatedMonthlyEarnings(Number(monthlyEarnings.toPrecision(3)));
        setUserShare(parseFloat(contributionAmount));

        // Calculate earnings over time
        setEarningsOverTime({
          threeMonths: calculateEarningsOverTime(3, newSharePercentage),
          sixMonths: calculateEarningsOverTime(6, newSharePercentage),
          oneYear: calculateEarningsOverTime(12, newSharePercentage),
          twoYears: calculateEarningsOverTime(24, newSharePercentage)
        });


        const monthsUntilNoWithdrawal = checkPoolSizeVsContribution(24);
        if (monthsUntilNoWithdrawal !== -1) {
          setWarningMessage(`⚠️ Warning: After ${monthsUntilNoWithdrawal} month(s), the pool size will become smaller than your original contribution. You won't be able to withdraw your stake after that unless the pool size expands. ⚠️`);
        } else {
          setWarningMessage('');
        }
      }
    } catch (error) {
      console.error('Error calculating earnings:', error);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <Logo onClick={() => navigate('/')} />
      </div>
      <div className={styles.main}>
        <p className={styles.slogan}>Become a <span id={styles.distinguish}>Partner</span></p>
        <p className={styles.infoText}>
          Join the GreenRoulette community and earn monthly rewards while supporting great causes.
        </p>
        <p className={styles.partnerLink}>Already a partner? <a href="/partner-dashboard">Go to dashboard</a></p>
        <div className={styles.info}>
          <h1 className={styles.title}>Introduction</h1>
          <p className={`${styles.infoText} ${styles.small}`}>
            <b>Join the GreenRoulette Partner Program</b> and turn your contribution into a rewarding opportunity! 
            As a partner, you become an integral part of our mission to create positive change while earning 
            passive income. By contributing Ethereum (ETH) to our pool, you not only support various charitable 
            causes but also secure your share of the monthly rewards distributed to partners.
          </p>
          <p className={`${styles.infoText} ${styles.small}`}>
            <b>How does it work?</b> It's simple. Each month, 1% of the total pool is set aside for our partners. 
            Your monthly earnings are determined by your share of the total ETH contributed by all partners. 
            The more you contribute, the larger your share, and the greater your potential earnings!
          </p>
          <Explanation style={{ marginBottom: '20px' }} />
          <p className={`${styles.infoText} ${styles.small}`}>
            <b>Why become a GreenRoulette Partner?</b> Besides the financial benefits, your participation helps us 
            continue our commitment to donate 4% of the pool to impactful charities, supporting education, 
            the environment, community well-being, and more. By becoming a partner, you're not just investing 
            in a financial opportunity—you're investing in a better future.
          </p>
          <p className={`${styles.infoText} ${styles.small}`}>
            <b>Ready to start earning while making a difference?</b> Explore our earnings calculator below to see how 
            much you could earn as a partner, and join us in building a greener, more sustainable world today.
          </p>
          <h1 className={styles.title}>Current Pool and Partner Statistics</h1>
          <div className={`${commonStyles.content} ${styles.stats}`}>
            <div>
              <p className={`${styles.infoText} ${styles.small}`} style={{ marginTop: '10px' }}>
              Current pool size (in ETH) 💸
              </p>
              <p className={`${styles.infoText} ${styles.small}`}>
              Number of current partners 🫂
              </p>
              <p className={`${styles.infoText} ${styles.small}`}>
              Total ETH contributed by all partners 💰
              </p>
              <p className={`${styles.infoText} ${styles.small}`}>
              Total rewards distributed to partners to date 🤑
              </p>
            </div>
            <div>
            <p className={`${styles.infoText} ${styles.small} ${styles.floatRight}`} style={{ marginTop: '0px' }}>
              <span className={styles.ethAmount}>{poolSize}</span>
              <img 
                src={ethereumLogo} 
                alt="ETH" 
                className={styles.ethLogo}
              />
            </p>
            <p id={styles.partnerCount} className={`${styles.infoText} ${styles.small} ${styles.floatRight}`}>
              {partnerCount}
            </p>
            <p className={`${styles.infoText} ${styles.small} ${styles.floatRight}`}>
              <span className={styles.ethAmount}>{totalContributions}</span>
              <img 
                src={ethereumLogo} 
                alt="ETH" 
                className={styles.ethLogo}
              />
            </p>
            <p className={`${styles.infoText} ${styles.small} ${styles.floatRight}`}>
              <span className={styles.ethAmount}>{totalRewards}</span>
              <img 
                src={ethereumLogo} 
                alt="ETH" 
                className={styles.ethLogo}
              />
            </p>
            </div>
          </div>
          <h1 className={styles.title}>Benefits of Becoming a Partner</h1>
          <div className={`${commonStyles.content} ${styles.benefits}`}>
          <ul className={`${styles.benefitsList} ${styles.infoText} ${styles.small}`}>
              <li className={styles.benefitCategory}>
                <b>Financial Benefits 💸</b>
                <ul>
                  <li>✅ Passive monthly income deposited straight to your account.</li>
                  <li>✅ Compounding effect if you reinvest earnings.</li>
                </ul>
              </li>
              <li className={styles.benefitCategory}>
              <b>Social Impact 🌍</b>
                <ul>
                  <li>✅ Contribution to sustainable causes.</li>
                  <li>✅ Recognition within the community: your name will get a special color in the chat.</li>
                </ul>
              </li>
              <li className={styles.benefitCategory}>
              <b>Other factors 🧘</b>
                <ul>
                  <li>✅ Have ease of mind knowing you can withdraw at any time*.</li>
                </ul>
              </li>
            </ul>
            <span id={styles.subtext}>* If pool size allows it.</span>
          </div>
          <h1 className={styles.title}>⚠️Risks and Considerations⚠️</h1>
          <div className={`${commonStyles.content} ${styles.risks}`}>
            <p className={`${styles.infoText} ${styles.small}`} style={{ marginTop: '20px' }}>
              <b>Security Risks and Hacks</b>
            </p>
            <p className={`${styles.infoText} ${styles.small}`}>
              As with any platform dealing with cryptocurrency, 
              there is always a risk of hacking or other security breaches. In the unfortunate 
              event that GreenRoulette gets hacked, you could lose some or all of your funds. 
              We take security seriously and implement best practices, but no system is entirely 
              immune to risks.
            </p>

            <p className={`${styles.infoText} ${styles.small}`} style={{ marginTop: '20px' }}>
              <b>Diminishing Returns Due to New Partners</b>
            </p>
            <p className={`${styles.infoText} ${styles.small}`}>
              The return you receive as a partner is proportional to your share of the total partner contributions. 
              If a significant  number of new partners join and contribute more ETH, your share will decrease. 
              This dilution can result in lower monthly returns and a potentially extended period
              to achieve a positive return on investment.
            </p>

            <p className={`${styles.infoText} ${styles.small}`} style={{ marginTop: '20px' }}>
              <b>Market Volatility</b>
            </p>
            <p className={`${styles.infoText} ${styles.small}`}>
              Cryptocurrency markets are highly volatile, and the value of 
              ETH can fluctuate dramatically. If the value of ETH drops significantly, it could
              impact the value of the pool and the returns distributed to partners.
            </p>

            <p className={`${styles.infoText} ${styles.small}`} style={{ marginTop: '20px' }}>
              <b>Changing Pool Size and Dynamics</b>
            </p>
            <p className={`${styles.infoText} ${styles.small}`}>
              The pool size is not guaranteed to stay 
              constant or grow. If the pool shrinks significantly due to withdrawals, losses, or less
              player participation, the 1% distributed to partners every month could become
              smaller than initially expected.
            </p>

            <p className={`${styles.infoText} ${styles.small}`} style={{ marginTop: '20px' }}>
              <b>Regulatory Risks</b>
            </p>
            <p className={`${styles.infoText} ${styles.small}`}>
              Cryptocurrencies and related activities are subject to 
              regulatory changes. New regulations or changes in existing laws could 
              affect how GreenRoulette operates, including potential restrictions on payouts 
              or operations.
            </p>

            <p className={`${styles.infoText} ${styles.small}`} style={{ marginTop: '20px' }}>
              <b>Operational Risks</b>
            </p>
            <p className={`${styles.infoText} ${styles.small}`}>
              GreenRoulette is dependent on the continuous and proper 
              functioning of its platform, smart contracts, and partnerships. Any technical
              issue, bug, or failure to execute smart contracts as expected could negatively
              affect the returns to partners.
            </p>

            <p className={`${styles.infoText} ${styles.small}`} style={{ marginTop: '20px' }}>
              <b>⚠️Returns are not guaranteed and GreenRoulette is not accountable if this is the case.⚠️</b>
            </p>
          </div>
          <h1 className={styles.title}>Calculate your Earnings & Become a Partner Now!</h1>
          <input
            type="number"
            placeholder="Enter your contribution amount (in ETH)" 
            className={styles.contributionInput}
            value={contributionAmount}
            onChange={handleContributionChange}
            onKeyPress={handleKeyPress}
          />
          <button className={styles.button} onClick={calculateEarnings}>Calculate Earnings 💸</button>
          {isAlreadyPartner === -1 ? <></> : 
          (isAlreadyPartner === 1 ? (
              <div className={`${commonStyles.content} ${styles.alreadyPartner}`}>
                <p className={`${styles.infoText} ${styles.small}`}>
                  You're already a partner. Please go to the <a href="/partner-dashboard">partner dashboard</a>.
                </p>
              </div>
            ) : (
          <>
          <div className={`${commonStyles.content} ${styles.calculator}`}>
            <div style={{ height: '200px', marginBottom: '20px' }}>
              <PartnerSharePieChart userShare={userShare} />
            </div>
            <div className={styles.calculatorContent}>
              <div className={styles.calculatorRow}>
                <p className={`${styles.infoText} ${styles.small}`}>
                  Share Percentage in the Partner Pool 📈:
                </p>
                <p className={`${styles.infoText} ${styles.small} ${styles.floatRight}`}>
                  <span className={styles.ethAmount}>{sharePercentage}%</span>
                </p>
              </div>
              <div className={styles.calculatorRow}>
                <p className={`${styles.infoText} ${styles.small}`}>
                  Estimated Monthly Earnings 💰*:
                </p>
                <p className={`${styles.infoText} ${styles.small} ${styles.floatRight}`}>
                  <span className={styles.ethAmount}>{estimatedMonthlyEarnings}</span>
                  <img 
                    src={ethereumLogo} 
                    alt="ETH" 
                    className={styles.ethLogo}
                    style={{marginRight: '0px'}}
                  />
                </p>
              </div>
              <div className={styles.calculatorRow}>
                <p className={`${styles.infoText} ${styles.small}`}>
                  Estimated Earnings Over Time*:
                </p>
              </div>
              <div className={styles.calculatorRow}>
                <ul className={`${styles.infoText} ${styles.small} ${styles.earningsList}`}>
                  <li>3 months: </li>
                  <li>6 months: </li>
                  <li>1 year: </li>
                  <li>2 years: </li>
                </ul>
                <ul className={`${styles.infoText} ${styles.small} ${styles.earningsAmounts}`}>
                  <li><span className={styles.ethAmount}>{earningsOverTime.threeMonths}</span> <img 
                    src={ethereumLogo} 
                    alt="ETH" 
                    className={styles.ethLogo}
                    style={{marginRight: '0px'}}
                  /></li>
                  <li><span className={styles.ethAmount}>{earningsOverTime.sixMonths}</span> <img 
                    src={ethereumLogo} 
                    alt="ETH" 
                    className={styles.ethLogo}
                    style={{marginRight: '0px'}}
                  /></li>
                  <li><span className={styles.ethAmount}>{earningsOverTime.oneYear}</span> <img 
                    src={ethereumLogo} 
                    alt="ETH" 
                    className={styles.ethLogo}
                    style={{marginRight: '0px'}}
                  /></li>
                  <li><span className={styles.ethAmount}>{earningsOverTime.twoYears}</span> <img 
                    src={ethereumLogo} 
                    alt="ETH" 
                    className={styles.ethLogo}
                    style={{marginRight: '0px'}}
                  /></li>
                </ul>
              </div>
              <span id={styles.subtext} style={{ position: 'relative', bottom: '10px' }}>* If current pool size and user share remains the same or expands.</span>
            </div>
          </div>
          <span className={styles.warning}>{warningMessage}</span>
          <button id={styles.becomePartner} className={styles.button} onClick={handleBecomePartner}>Become a Partner 🚀</button>
          </>
          ))}
        </div>
      </div>
      <div className={styles.footbar}>
        <Logo />
        <div className={styles.buttonGroup}>
          <button className={styles.footbarButton}><Mail /></button>
          <button className={styles.footbarButton}><img src={xLogo} alt="X Logo" /></button>
        </div>
      </div>
    </div>
  );
}

export default BecomePartner;
