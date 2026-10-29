require('dotenv').config();

const express = require('express');
const pool = require('./config/database');

const authRouter = require('./routes/auth.routes');
const schedulesRouter = require('./routes/schedules.routes');
const rescheduleRequestsRouter = require('./routes/reschedule-requests.routes');
const availableSlotsRouter = require('./routes/available-slots.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/reschedule-requests', rescheduleRequestsRouter);
app.use('/api/available-slots', availableSlotsRouter);

// Root endpoint
app.get('/', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Smart Reschedule Assistant API is running',
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database'
    );

    return res.status(200).json({
      status: 'success',
      message: 'API and database are running',
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);

    return res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});