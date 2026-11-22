require('dotenv').config();

const readline = require('readline');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const DEMO_USERS = [
  {
    name: 'Budi Santoso',
    email: 'budi.santoso.demo@example.test',
    role: 'CUSTOMER',
    scheduleId: 1,
    scheduleName: 'Budi Santoso',
  },
  {
    name: 'Siti Rahma',
    email: 'siti.rahma.demo@example.test',
    role: 'CUSTOMER',
    scheduleId: 2,
    scheduleName: 'Siti Rahma',
  },
  {
    name: 'Andi Pratama',
    email: 'andi.pratama.demo@example.test',
    role: 'CUSTOMER',
    scheduleId: 3,
    scheduleName: 'Andi Pratama',
  },
  {
    name: 'Admin Gymnasium',
    email: 'admin.gymnasium.demo@example.test',
    role: 'ADMIN',
  },
];

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(question);

    if (!stdin.isTTY) {
      resolve(null);
      return;
    }

    let password = '';

    stdin.setRawMode(true);
    stdin.resume();

    function onData(key) {
      const value = key.toString();

      if (value === '\u0003') {
        cleanup();
        process.exit(130);
      }

      if (value === '\r' || value === '\n') {
        cleanup();
        stdout.write('\n');
        resolve(password);
        return;
      }

      if (value === '\u007f' || value === '\b') {
        password = password.slice(0, -1);
        return;
      }

      if (value.charCodeAt(0) >= 32 && value.charCodeAt(0) !== 127) {
        password += value;
      }
    }

    function cleanup() {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    }

    stdin.on('data', onData);
  });
}

function validatePassword(password, label) {
  if (password.length < 12) {
    throw new Error(
      `${label} must contain at least 12 characters.`
    );
  }

  if (password.length > 72) {
    throw new Error(
      `${label} must not exceed 72 characters for bcrypt compatibility.`
    );
  }
}

async function createDemoUsers(client, passwordHashes) {
  const userIds = new Map();

  for (const user of DEMO_USERS) {
    const result = await client.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, name, email, role
      `,
      [
        user.name,
        user.email,
        passwordHashes.get(user.email),
        user.role,
      ]
    );

    let savedUser = result.rows[0];

    if (!savedUser) {
      const existing = await client.query(
        `
          SELECT id, name, email, role
          FROM users
          WHERE email = $1
        `,
        [user.email]
      );

      savedUser = existing.rows[0];

      if (
        !savedUser ||
        savedUser.name !== user.name ||
        savedUser.role !== user.role
      ) {
        throw new Error(
          `Existing account ${user.email} has unexpected data. ` +
          'No changes have been committed.'
        );
      }
    }

    userIds.set(user.email, savedUser.id);

    console.log(
      `Account verified: ${savedUser.email} (${savedUser.role})`
    );
  }

  return userIds;
}

async function linkDemoSchedules(client, userIds) {
  for (const user of DEMO_USERS) {
    if (!user.scheduleId) {
      continue;
    }

    const customerId = userIds.get(user.email);

    const result = await client.query(
      `
        UPDATE schedules
        SET customer_id = $1
        WHERE id = $2
          AND customer_name = $3
          AND (
            customer_id IS NULL
            OR customer_id = $1
          )
        RETURNING id, customer_name, customer_id
      `,
      [customerId, user.scheduleId, user.scheduleName]
    );

    if (result.rowCount !== 1) {
      throw new Error(
        `Could not safely link schedule ${user.scheduleId} ` +
        `to ${user.email}. The schedule may be missing, ` +
        'have a different customer name, or belong to another account.'
      );
    }

    console.log(
      `Schedule ${result.rows[0].id} linked to ${user.email}`
    );
  }
}

async function main() {
  let client;

  try {
    const customerPassword = await askPassword(
      'Enter demo CUSTOMER password (hidden): '
    );

    if (customerPassword === null) {
      throw new Error(
        'Run this script directly in an interactive terminal.'
      );
    }

    const adminPassword = await askPassword(
      'Enter demo ADMIN password (hidden): '
    );

    validatePassword(customerPassword, 'Customer password');
    validatePassword(adminPassword, 'Admin password');

    if (customerPassword === adminPassword) {
      throw new Error(
        'Customer and Admin passwords must be different.'
      );
    }

    console.log('\nPreparing demo accounts...');

    const passwordHashes = new Map();

    for (const user of DEMO_USERS) {
      const password =
        user.role === 'ADMIN' ? adminPassword : customerPassword;

      const passwordHash = await bcrypt.hash(password, 12);

      passwordHashes.set(user.email, passwordHash);
    }

    client = await pool.connect();

    await client.query('BEGIN');

    await client.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');
    await client.query('LOCK TABLE schedules IN SHARE ROW EXCLUSIVE MODE');

    const userIds = await createDemoUsers(client, passwordHashes);

    await linkDemoSchedules(client, userIds);

    await client.query('COMMIT');

    console.log('\nDemo accounts are ready.');
    console.log('Customer demo password is shared by the three Customer accounts.');
    console.log('Admin has a separate password.');
    console.log('Passwords were not printed or stored by this script.');
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError.message);
      }
    }

    console.error('\nFailed to prepare demo accounts:', error.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

main();