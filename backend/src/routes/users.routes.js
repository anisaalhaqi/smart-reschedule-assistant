const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const {
  authenticateToken,
  authorizeRoles,
} = require('../middleware/auth.middleware');

const router = express.Router();

// Semua endpoint users hanya dapat diakses oleh Admin.
router.use(authenticateToken, authorizeRoles('ADMIN'));

// GET /api/users
// Admin mengambil seluruh daftar Customer.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT id, name, email, role, created_at
        FROM users
        WHERE role = 'CUSTOMER'
        ORDER BY created_at DESC, id DESC
      `
    );

    return res.status(200).json({
      status: 'success',
      data: {
        users: result.rows,
      },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve members',
    });
  }
});

// POST /api/users
// Admin membuat akun Customer baru.
router.post('/', async (req, res) => {
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
      message: 'Member created successfully',
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Failed to create member:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to create member',
    });
  }
});

// GET /api/users/:id
// Admin mengambil detail satu Customer.
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user ID',
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT id, name, email, role, created_at
        FROM users
        WHERE id = $1
          AND role = 'CUSTOMER'
        LIMIT 1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        user: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Failed to fetch member:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve member',
    });
  }
});

module.exports = router;
