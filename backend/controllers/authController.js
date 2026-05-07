const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const SALT_ROUNDS = 10;

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res) => {
  try {
    console.log('=== REGISTER ATTEMPT ===');
    console.log('Request body:', req.body);
    
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      console.log('Validation failed: missing fields');
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and password are required.' 
      });
    }
    
    if (password.length < 6) {
      console.log('Validation failed: password too short');
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters.' 
      });
    }

    // Check if user already exists
    console.log('Checking if user exists:', email);
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      console.log('User already exists:', email);
      return res.status(409).json({ 
        success: false,
        message: 'Email is already registered.' 
      });
    }

    // Hash password and create user
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    console.log('Creating user in database...');
    const userId = await UserModel.create({ name, email, hashedPassword });
    console.log('User created with ID:', userId);
    
    console.log('Generating token...');
    const token = generateToken(userId);
    console.log('Token generated successfully');

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
    console.error('Register error - Full error:', err);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during registration.',
      error: err.message 
    });
  }
};

const login = async (req, res) => {
  try {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('Validation failed: missing email or password');
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required.' 
      });
    }

    // Find user
    console.log('Finding user by email:', email);
    const user = await UserModel.findByEmail(email);
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password.' 
      });
    }
    console.log('User found:', user.id);

    // Check password
    console.log('Checking password...');
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password.' 
      });
    }
    console.log('Password matched');

    // Generate token
    console.log('Generating token...');
    const token = generateToken(user.id);
    console.log('Token generated');

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
    console.error('Login error - Full error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during login.',
      error: err.message 
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
