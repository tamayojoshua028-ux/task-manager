const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No token provided');
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token and decode
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set user info in request (matches the token structure)
    req.user = { id: decoded.id };
    req.userId = decoded.id;
    
    console.log('User authenticated, ID:', req.user.id);
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ 
      success: false,
      message: 'Not authorized, token failed' 
    });
  }
};

module.exports = { protect };