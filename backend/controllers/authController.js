const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const SALT_ROUNDS = 10;

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },  // This puts the user ID in the token as 'id'
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and password are required.' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters.' 
      });
    }

    // Check if user already exists
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ 
        success: false,
        message: 'Email is already registered.' 
      });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = await UserModel.create({ name, email, hashedPassword });
    const token = generateToken(userId);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: { 
        id: userId, 
        name, 
        email 
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during registration.' 
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required.' 
      });
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password.' 
      });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password.' 
      });
    }

    // Generate token
    const token = generateToken(user.id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email 
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during login.' 
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found.' 
      });
    }
    return res.status(200).json({ 
      success: true,
      user 
    });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error.' 
    });
  }
};

module.exports = { register, login, getMe };