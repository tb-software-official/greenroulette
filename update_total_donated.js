require('dotenv').config();

const { Web3 } = require('web3');
const abi_roulette = require('./src/abis/rouletteContractAbi.json');
const infuraUrl = process.env.INFURA_URL;
const rouletteContractAddress = "0xfCBA36DB3ED62653b80da3Ab50a074Ae64083C43";
const web3 = new Web3(infuraUrl);
const mysql = require('mysql2/promise');

const rouletteContract = new web3.eth.Contract(abi_roulette, rouletteContractAddress);

async function updateTotalDonations() {
  try {
    // Create a MySQL connection pool with better error handling
    const pool = mysql.createPool({
      host: '127.0.0.1',
      user: 'greenroulette',
      password: process.env.DB_PASS,
      database: 'greenroulette',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    const totalDonated = await rouletteContract.methods.getTotalDonated().call();
    console.log('Total Donated:', totalDonated);

    const sql = `UPDATE total_donations SET total_amount = ?;`;
    const [results] = await connection.query(sql, [totalDonated]);
    console.log('Database Update Results:', results);
    connection.release();

    await pool.end();
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

updateTotalDonations();
