import { useState, useEffect } from 'react';
import { buildApiUrl } from '../config';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);

  // Create floating particles
  useEffect(() => {
    const particleArray = [];
    for (let i = 0; i < 50; i++) {
      particleArray.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    setParticles(particleArray);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: (particle.x + particle.speedX + 100) % 100,
        y: (particle.y + particle.speedY + 100) % 100,
      })));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Load saved credentials if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email, password }
        : { name, email, password };

      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Handle remember me - save both email and password
      if (rememberMe && isLogin) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else if (!rememberMe) {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container-enhanced" onMouseMove={handleMouseMove}>
      {/* Animated Background */}
      <div className="auth-bg-animation">
        <div className="auth-bg-gradient"></div>
        <div className="auth-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
        
        {/* Floating Particles */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="auth-particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animation: `particlePulse ${Math.random() * 3 + 2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Main Card */}
      <div className="auth-card-enhanced">
        <div className="auth-card-glow" style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(118, 171, 174, 0.3), transparent 50%)`
        }} />
        
        <div className="auth-header">
          <div className="auth-icon">📚✨</div>
          <h1>TaskMaster</h1>
          <p>Your intelligent task companion</p>
        </div>

        <div className="auth-toggle">
          <button 
            className={`toggle-btn ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button 
            className={`toggle-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Create Account
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form-enhanced">
          {!isLogin && (
            <div className="input-group">
              <div className="input-icon">👤</div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Full Name"
              />
              <div className="input-border"></div>
            </div>
          )}

          <div className="input-group">
            <div className="input-icon">📧</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email Address"
            />
            <div className="input-border"></div>
          </div>

          <div className="input-group">
            <div className="input-icon">🔒</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
            />
            <div className="input-border"></div>
          </div>

          <div className="auth-options">
            <label className="remember-me">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              /> 
              Remember me
            </label>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? (
              <span className="loading-spinner-small"></span>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer-enhanced">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      <style jsx="true">{`
        .auth-container-enhanced {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          overflow: hidden;
          background: #222831;
        }

        .auth-bg-animation {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .auth-bg-gradient {
          position: absolute;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 50% 50%, #76ABAE, #31363F, #222831);
          animation: rotateGradient 20s ease infinite;
        }

        @keyframes rotateGradient {
          0% { transform: rotate(0deg); opacity: 0.3; }
          50% { transform: rotate(180deg); opacity: 0.5; }
          100% { transform: rotate(360deg); opacity: 0.3; }
        }

        .auth-bg-shapes {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.3;
          animation: float 10s infinite;
        }

        .shape-1 {
          width: 300px;
          height: 300px;
          background: #76ABAE;
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .shape-2 {
          width: 400px;
          height: 400px;
          background: #31363F;
          bottom: -150px;
          right: -150px;
          animation-delay: 2s;
        }

        .shape-3 {
          width: 200px;
          height: 200px;
          background: #76ABAE;
          top: 50%;
          left: 50%;
          animation-delay: 4s;
        }

        .shape-4 {
          width: 250px;
          height: 250px;
          background: #EEEEEE;
          bottom: 20%;
          right: 10%;
          animation-delay: 6s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 30px) scale(1.1); }
        }

        .auth-particle {
          position: absolute;
          background: #76ABAE;
          border-radius: 50%;
          pointer-events: none;
        }

        @keyframes particlePulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }

        .auth-card-enhanced {
          position: relative;
          width: 480px;
          max-width: 90%;
          padding: 40px;
          background: rgba(49, 54, 63, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 30px;
          border: 1px solid rgba(118, 171, 174, 0.3);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          z-index: 10;
          animation: slideIn 0.6s ease;
          overflow: hidden;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .auth-card-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          transition: background 0.3s ease;
        }

        .auth-header {
          text-align: center;
          margin-bottom: 35px;
        }

        .auth-icon {
          font-size: 60px;
          margin-bottom: 15px;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .auth-header h1 {
          font-size: 32px;
          background: linear-gradient(135deg, #EEEEEE 0%, #76ABAE 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }

        .auth-header p {
          color: #c5c5c5;
          font-size: 14px;
        }

        .auth-toggle {
          display: flex;
          gap: 10px;
          background: rgba(34, 40, 49, 0.5);
          padding: 5px;
          border-radius: 50px;
          margin-bottom: 30px;
        }

        .toggle-btn {
          flex: 1;
          padding: 10px 20px;
          background: transparent;
          border: none;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          color: #c5c5c5;
          transition: all 0.3s ease;
        }

        .toggle-btn.active {
          background: linear-gradient(135deg, #76ABAE 0%, #5a8a8d 100%);
          color: white;
          box-shadow: 0 5px 15px rgba(118, 171, 174, 0.3);
        }

        .auth-error {
          background: rgba(224, 122, 95, 0.2);
          border: 1px solid #e07a5f;
          color: #e07a5f;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 20px;
          text-align: center;
          font-size: 14px;
        }

        .auth-form-enhanced {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          z-index: 1;
        }

        .input-group input {
          width: 100%;
          padding: 14px 20px 14px 50px;
          background: rgba(34, 40, 49, 0.8);
          border: 1px solid rgba(118, 171, 174, 0.3);
          border-radius: 12px;
          font-size: 16px;
          color: #EEEEEE;
          transition: all 0.3s ease;
        }

        .input-group input:focus {
          outline: none;
          border-color: #76ABAE;
          box-shadow: 0 0 0 3px rgba(118, 171, 174, 0.2);
        }

        .input-group input::placeholder {
          color: #c5c5c5;
        }

        .input-border {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #76ABAE, #EEEEEE);
          transition: all 0.3s ease;
        }

        .input-group input:focus ~ .input-border {
          width: 80%;
          left: 10%;
        }

        .auth-options {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          font-size: 13px;
          margin: 5px 0;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: #c5c5c5;
        }

        .remember-me input {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #76ABAE;
        }

        .auth-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #76ABAE 0%, #5a8a8d 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 10px;
        }

        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(118, 171, 174, 0.4);
        }

        .auth-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loading-spinner-small {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-footer-enhanced {
          text-align: center;
          margin-top: 25px;
          font-size: 14px;
          color: #c5c5c5;
        }

        .auth-footer-enhanced button {
          background: none;
          border: none;
          color: #76ABAE;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: color 0.3s;
        }

        .auth-footer-enhanced button:hover {
          color: #5a8a8d;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
