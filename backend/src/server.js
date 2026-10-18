
require('dotenv').config();

const express = require('express');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Smart Reschedule Assistant API is running',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT current_database() AS database');

    res.status(200).json({
      status: 'success',
      message: 'API and database are running',
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);

    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
