const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

const JWT_EXPIRES_IN = '1h';

// POST /api/auth/register
// Registrasi publik hanya diperbolehkan untuk Customer.
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Name, email, and password are required',
    });
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedName || normalizedName.length > 120) {
    return res.status(400).json({
      status: 'error',
      message: 'Name must contain 1–120 characters',
    });
  }

  if (
    normalizedEmail.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'A valid email address is required',
    });
  }

  if (password.length < 12 || password.length > 72) {
    return res.status(400).json({
      status: 'error',
      message: 'Password must contain 12–72 characters',
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'CUSTOMER')
        ON CONFLICT (email) DO NOTHING
        RETURNING id, name, email, role, created_at
      `,
      [normalizedName, normalizedEmail, passwordHash]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists',
      });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Customer account created successfully',
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Customer registration failed:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to register customer',
    });
  }
});

// POST /api/auth/login
// Login untuk Customer maupun Admin yang sudah terdaftar.
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Email and password are required',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length > 255 || password.length > 72) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid email or password format',
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT id, name, email, password_hash, role
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [normalizedEmail]
    );

    const user = result.rows[0];

    // Pesan yang sama untuk email tidak terdaftar dan password salah.
    if (
      !user ||
      !(await bcrypt.compare(password, user?.password_hash ?? ''))
    ) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error('JWT_SECRET is not configured');

      return res.status(500).json({
        status: 'error',
        message: 'Authentication service is not configured',
      });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      secret,
      {
        algorithm: 'HS256',
        expiresIn: JWT_EXPIRES_IN,
      }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        token_type: 'Bearer',
        expires_in: 3600,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login failed:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to log in',
    });
  }
});

// GET /api/auth/me
// Menguji JWT dan mengambil identitas pengguna yang sedang login.
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, email, role, created_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Authenticated user no longer exists',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Authenticated user retrieved successfully',
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Failed to retrieve authenticated user:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve authenticated user',
    });
  }
});

module.exports = router;