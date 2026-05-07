const db = require('../db');

const findByEmail = async (email) => {
  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return users[0];
  } catch (error) {
    console.error('findByEmail error:', error);
    throw error;
  }
};

const findById = async (id) => {
  try {
    const [users] = await db.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [id]);
    return users[0];
  } catch (error) {
    console.error('findById error:', error);
    throw error;
  }
};

const create = async ({ name, email, hashedPassword }) => {
  try {
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );
    return result.insertId;
  } catch (error) {
    console.error('create user error:', error);
    throw error;
  }
};

module.exports = { findByEmail, findById, create };