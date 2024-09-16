require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const validator = require('validator');

const app = express();
const port = process.env.PORT || 6969;

// Middleware
app.use(cors());
app.use(bodyParser.json());

const validateAndSanitizeInput = (input) => {
  if (!input || typeof input !== 'string' || !validator.isAlphanumeric(input, 'en-US', {ignore: ' .-_'})) {
      return false;
  }
  return validator.trim(input);
};


// Create a MySQL connection
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASS, // Your MySQL password
  database: 'GreenRoulette'
});

// Verify MySQL connection
pool.getConnection((err, connection) => {
  if (err) throw err;
  console.log('Connected as ID ' + connection.threadId);
  connection.release();
});

// Route to handle adding a new player
app.post('/api/add-player', (req, res) => {
  const { address } = req.body;
  const query = `
    INSERT INTO players (address, username, total_win, total_donated)
    SELECT * FROM (SELECT ? as address, NULL as username, 0.00000000 as total_win, 0.00000000 as total_donated) AS tmp
    WHERE NOT EXISTS (
      SELECT address FROM players WHERE address = ?
    ) LIMIT 1;
  `;
  pool.query(query, [address, address], (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: 'Player added', results });
  });
});

app.post('/api/update-username', (req, res) => {
  const { username, userAddress } = req.body;

  let sanitizedUsername = validateAndSanitizeInput(username);
  
  if (!sanitizedUsername) {
    sanitizedUsername = null;
  }

  const sql = `UPDATE players SET username = ? WHERE address = ?`;
  pool.query(sql, [sanitizedUsername, userAddress], (error, results) => {
      if (error) {
          console.error('Failed to update username:', error);
          return res.status(500).send({ success: false });
      }
      res.send({ success: true });
  });
});

app.post('/api/donations', (req, res) => {
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

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting connection:', err);
      return res.status(500).send('Database connection error');
    }

    connection.beginTransaction(err => {
      if (err) {
        console.error('Error beginning transaction:', err);
        return res.status(500).send('Database transaction error');
      }

      connection.query(donationInsertSql, [userAddress || null, sanitizedAmountUSD, donationDate], (err, result) => {
        if (err) {
          return connection.rollback(() => {
            console.error('Error inserting donation:', err);
            res.status(500).send('Error recording donation');
          });
        }

        // Only proceed with updating the player's total_donated if userAddress is provided
        if (userAddress) {
          connection.query(playerUpdateSql, [sanitizedAmountETH, userAddress], (err, result) => {
            if (err) {
              return connection.rollback(() => {
                console.error('Error updating player total donated:', err);
                res.status(500).send('Error updating total donated');
              });
            }

            connection.commit(err => {
              if (err) {
                return connection.rollback(() => {
                  console.error('Error committing transaction:', err);
                  res.status(500).send('Transaction commit error');
                });
              }

              res.send('Donation recorded and total donated updated successfully');
            });
          });
        } else {
          // Commit transaction if no user address to update
          connection.commit(err => {
            if (err) {
              return connection.rollback(() => {
                console.error('Error committing transaction:', err);
                res.status(500).send('Transaction commit error');
              });
            }

            res.send('Anonymous donation recorded successfully');
          });
        }
      });
    });
  });
});

app.get('/api/get_donations', (req, res) => {
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

  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching donations:', err);
      res.status(500).send('Error fetching donations');
    } else {
      res.json(results);
    }
  });
});

// Endpoint to get top donators
app.get('/api/top-donators', (req, res) => {
  const sql = `
    SELECT address, username, total_donated 
    FROM players 
    WHERE total_donated > 0
    ORDER BY total_donated DESC 
    LIMIT 100;
  `;
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching top donators:', err);
      return res.status(500).send('Error fetching top donators');
    }
    res.json(results);
  });
});

// Endpoint to get top winners
app.get('/api/top-winners', (req, res) => {
  const sql = `
    SELECT address, username, total_win 
    FROM players 
    WHERE total_win > 0
    ORDER BY total_win DESC 
    LIMIT 100;
  `;
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching top winners:', err);
      return res.status(500).send('Error fetching top winners');
    }
    res.json(results);
  });
});

// Endpoint to get total amount donated
app.get('/api/total_donated', (req, res) => {
  const sql = `SELECT total_amount FROM total_donations;`;
  
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching total amount donated:', err);
      return res.status(500).send('Error fetching total amount donated');
    }
    res.json(results);
  });
});

// Endpoint to get the username given an address
app.get('/api/get_username/:address', (req, res) => {
  const { address } = req.params;

  const sql = `SELECT username FROM players WHERE address = ? LIMIT 1`;

  pool.query(sql, [address], (err, results) => {
    if (err) {
      console.error('Error fetching username:', err);
      return res.status(500).json({ error: 'Error fetching username' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Username not found for the given address' });
    }

    res.json({ username: results[0].username });
  });
});

// Endpoint to set the partner contribution for a user
app.post('/api/set_partner_contribution', (req, res) => {
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

  pool.query(sql, [sanitizedContribution, address], (err, result) => {
    if (err) {
      console.error('Error updating partner contribution:', err);
      return res.status(500).json({ error: 'Error updating partner contribution' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ message: 'Partner contribution updated successfully' });
  });
});

// Endpoint to get all partners and their contribution amounts
app.get('/api/get_all_partners', (req, res) => {
  const sql = `
    SELECT address, username, partner_contribution
    FROM players
    WHERE partner_contribution > 0
    ORDER BY partner_contribution DESC
  `;

  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching partners:', err);
      return res.status(500).json({ error: 'Error fetching partners' });
    }

    const partners = results.map(row => ({
      address: row.address,
      username: row.username || 'Anonymous',
      contribution: parseFloat(row.partner_contribution)
    }));

    res.json({ partners });
  });
});

// Endpoint to revoke partnership
app.post('/api/remove_partner', (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  const sql = `
    UPDATE players 
    SET partner_contribution = 0 
    WHERE address = ?
  `;

  pool.query(sql, [address], (err, result) => {
    if (err) {
      console.error('Error revoking partnership:', err);
      return res.status(500).json({ error: 'Error revoking partnership' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.json({ message: 'Partner removed successfully' });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
