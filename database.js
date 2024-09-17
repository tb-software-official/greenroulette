require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const validator = require('validator');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const https = require('https');

const app = express();
const port = process.env.PORT || 6969;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: ['https://greenroulette.io', 'https://www.greenroulette.io'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(bodyParser.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Function to validate and sanitize input
const validateAndSanitizeInput = (input) => {
  if (!input || typeof input !== 'string' || !validator.isAlphanumeric(input, 'en-US', { ignore: ' .-_' })) {
    return false;
  }
  return validator.trim(input);
};

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

// Verify MySQL connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL as ID ' + connection.threadId);
    connection.release();
  } catch (err) {
    console.error('Error connecting to MySQL:', err);
  }
})();

// Route to handle adding a new player with parameterized queries
app.post('/api/add-player', async (req, res) => {
  const { address } = req.body;
  
  if (!validator.isEthereumAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }

  const query = `
    INSERT INTO players (address, username, total_win, total_donated)
    SELECT * FROM (SELECT ? as address, NULL as username, 0.00000000 as total_win, 0.00000000 as total_donated) AS tmp
    WHERE NOT EXISTS (
      SELECT address FROM players WHERE address = ?
    ) LIMIT 1;
  `;
  
  try {
    const [results] = await pool.query(query, [address, address]);
    res.json({ message: 'Player added', results });
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update username securely
app.post('/api/update-username', async (req, res) => {
  const { username, userAddress } = req.body;

  if (!validator.isEthereumAddress(userAddress)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }

  let sanitizedUsername = validateAndSanitizeInput(username);
  if (!sanitizedUsername) {
    sanitizedUsername = null;
  }

  const sql = `UPDATE players SET username = ? WHERE address = ?`;
  
  try {
    const [results] = await pool.query(sql, [sanitizedUsername, userAddress]);
    res.send({ success: true });
  } catch (error) {
    console.error('Failed to update username:', error);
    res.status(500).send({ success: false });
  }
});

app.post('/api/donations', async (req, res) => {
  const { userAddress, donationAmountUSD, donationAmountETH, donationDate } = req.body;

  const donationInsertSql = `
    INSERT INTO donations (user_address, donation_amount, donation_date) 
    VALUES (?, ?, ?);
  `;

  const playerUpdateSql = `
    UPDATE players 
    SET total_donated = total_donated + ? 
    WHERE address = ?;
  `;

  let sanitizedAmountUSD = validateAndSanitizeInput(donationAmountUSD);
  let sanitizedAmountETH = validateAndSanitizeInput(donationAmountETH);
  
  if (!sanitizedAmountUSD) {
    return res.status(400).send('Invalid donation amount');
  }

  if (!sanitizedAmountETH) {
    return res.status(400).send('Invalid donation amount');
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.query(donationInsertSql, [userAddress || null, sanitizedAmountUSD, donationDate]);

      if (userAddress) {
        await connection.query(playerUpdateSql, [sanitizedAmountETH, userAddress]);
      }

      await connection.commit();
      res.send(userAddress ? 'Donation recorded and total donated updated successfully' : 'Anonymous donation recorded successfully');
    } catch (error) {
      await connection.rollback();
      console.error('Error in donation transaction:', error);
      res.status(500).send('Error processing donation');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error getting database connection:', error);
    res.status(500).send('Database connection error');
  }
});

app.get('/api/get_donations', async (req, res) => {
  const sql = `
  SELECT 
    donations.donation_date, 
    donations.user_address, 
    donations.donation_amount,
    players.username 
  FROM 
    donations 
  LEFT JOIN 
    players 
  ON 
    donations.user_address = players.address 
  ORDER BY 
    donations.donation_date DESC 
  LIMIT 10
`;

  try {
    const [results] = await pool.query(sql);
    res.json(results);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).send('Error fetching donations');
  }
});

// Endpoint to get top donators
app.get('/api/top-donators', async (req, res) => {
  const sql = `
    SELECT address, username, total_donated 
    FROM players 
    WHERE total_donated > 0
    ORDER BY total_donated DESC 
    LIMIT 100;
  `;
  try {
    const [results] = await pool.query(sql);
    res.json(results);
  } catch (error) {
    console.error('Error fetching top donators:', error);
    res.status(500).send('Error fetching top donators');
  }
});

// Endpoint to get top winners
app.get('/api/top-winners', async (req, res) => {
  const sql = `
    SELECT address, username, total_win 
    FROM players 
    WHERE total_win > 0
    ORDER BY total_win DESC 
    LIMIT 100;
  `;
  try {
    const [results] = await pool.query(sql);
    res.json(results);
  } catch (error) {
    console.error('Error fetching top winners:', error);
    res.status(500).send('Error fetching top winners');
  }
});

// Endpoint to get total amount donated
app.get('/api/total_donated', async (req, res) => {
  const sql = `SELECT total_amount FROM total_donations;`;
  
  try {
    const [results] = await pool.query(sql);
    res.json(results);
  } catch (error) {
    console.error('Error fetching total amount donated:', error);
    res.status(500).send('Error fetching total amount donated');
  }
});

// Endpoint to update total_donated for a player
app.post('/api/update_total_donated', async (req, res) => {
  const { address, amount } = req.body;

  if (!address || amount === undefined) {
    return res.status(400).json({ error: 'Address and amount are required' });
  }

  let sanitizedAmount = validateAndSanitizeInput(amount);
  if (!sanitizedAmount) {
    return res.status(400).json({ error: 'Invalid amount format. Must be a number with up to 8 decimal places.' });
  }

  const sql = `
    UPDATE players 
    SET total_donated = total_donated + ? 
    WHERE address = ?
  `;

  try {
    const [result] = await pool.query(sql, [sanitizedAmount, address]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ message: 'Total donated updated successfully' });
  } catch (error) {
    console.error('Error updating total_donated:', error);
    res.status(500).json({ error: 'Error updating total_donated' });
  }
});

// Endpoint to update total_win for a player
app.post('/api/update_total_win', async (req, res) => {
  const { address, amount } = req.body;

  if (!address || amount === undefined) {
    return res.status(400).json({ error: 'Address and amount are required' });
  }

  let sanitizedAmount = validateAndSanitizeInput(amount);
  if (!sanitizedAmount) {
    return res.status(400).json({ error: 'Invalid amount format. Must be a number with up to 8 decimal places.' });
  }

  const sql = `
    UPDATE players 
    SET total_win = total_win + ? 
    WHERE address = ?
  `;

  try {
    const [result] = await pool.query(sql, [sanitizedAmount, address]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ message: 'Total win updated successfully' });
  } catch (error) {
    console.error('Error updating total_win:', error);
    res.status(500).json({ error: 'Error updating total_win' });
  }
});

// Endpoint to get the username given an address
app.get('/api/get_username/:address', async (req, res) => {
  const { address } = req.params;

  const sql = `SELECT username FROM players WHERE address = ? LIMIT 1`;

  try {
    const [results] = await pool.query(sql, [address]);
    if (results.length === 0) {
      return res.status(404).json({ message: 'Username not found for the given address' });
    }
    res.json({ username: results[0].username });
  } catch (error) {
    console.error('Error fetching username:', error);
    res.status(500).json({ error: 'Error fetching username' });
  }
});

// Endpoint to set the partner contribution for a user
app.post('/api/set_partner_contribution', async (req, res) => {
  const { address, contribution } = req.body;

  if (!address || contribution === undefined) {
    return res.status(400).json({ error: 'Address and contribution amount are required' });
  }

  let sanitizedContribution = validateAndSanitizeInput(contribution);
  if (!sanitizedContribution) {
    return res.status(400).json({ error: 'Invalid contribution format. Must be a number with up to 8 decimal places.' });
  }

  const sql = `
    UPDATE players 
    SET partner_contribution = partner_contribution + ? 
    WHERE address = ?
  `;

  try {
    const [result] = await pool.query(sql, [sanitizedContribution, address]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ message: 'Partner contribution updated successfully' });
  } catch (error) {
    console.error('Error updating partner contribution:', error);
    res.status(500).json({ error: 'Error updating partner contribution' });
  }
});

// Endpoint to get all partners and their contribution amounts
app.get('/api/get_all_partners', async (req, res) => {
  const sql = `
    SELECT address, username, partner_contribution
    FROM players
    WHERE partner_contribution > 0
    ORDER BY partner_contribution DESC
  `;

  try {
    const [results] = await pool.query(sql);
    const partners = results.map(row => ({
      address: row.address,
      username: row.username || 'Anonymous',
      contribution: parseFloat(row.partner_contribution)
    }));
    res.json({ partners });
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ error: 'Error fetching partners' });
  }
});

// Endpoint to revoke partnership
app.post('/api/remove_partner', async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  const sql = `
    UPDATE players 
    SET partner_contribution = 0 
    WHERE address = ?
  `;

  try {
    const [result] = await pool.query(sql, [address]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    res.json({ message: 'Partner removed successfully' });
  } catch (error) {
    console.error('Error revoking partnership:', error);
    res.status(500).json({ error: 'Error revoking partnership' });
  }
});

const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/greenroulette.io/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/greenroulette.io/fullchain.pem'),
};

https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`Secure server running on https://localhost:${port}`);
});