import { useState, useEffect } from 'react';

export default function WalkingCharacter({ tasks, lastAction, user }) {
  const [position, setPosition] = useState({ x: -100, y: 20 });
  const [direction, setDirection] = useState(1);
  const [currentGif, setCurrentGif] = useState('/sprites/character-idle.gif');
  const [message, setMessage] = useState('🐱 Hello!');
  const [showMessage, setShowMessage] = useState(false);
  const [isWalking, setIsWalking] = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const [skipNextMonitor, setSkipNextMonitor] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [clickCooldown, setClickCooldown] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive character size
  const CHARACTER_SIZE = isMobile ? 55 : 80;

  const showMessageBox = (msg, duration = 3000) => {
    setMessage(msg);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), duration);
  };

  // WELCOME on login
  useEffect(() => {
    if (user && !hasWelcomed) {
      setCurrentGif('/sprites/character-welcome.gif');
      showMessageBox(`🎉 Welcome!`, 3000);
      setHasWelcomed(true);
      setIsWalking(false);
      
      setTimeout(() => {
        const pendingCount = tasks?.filter(t => t.status !== 'completed').length || 0;
        if (pendingCount > 0) {
          setCurrentGif('/sprites/character-walking.gif');
          setIsWalking(true);
        } else {
          setCurrentGif('/sprites/character-waiting.gif');
          setIsWalking(false);
        }
      }, 3500);
    }
  }, [user, tasks]);

  // Monitor tasks for changes
  useEffect(() => {
    if (!tasks || !hasWelcomed) return;
    if (skipNextMonitor) return;
    
    const pendingCount = tasks.filter(t => t.status !== 'completed').length;
    const overdueCount = tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length;
    
    if (overdueCount > 0) {
      setCurrentGif('/sprites/character-sad.gif');
      setIsWalking(false);
      return;
    }
    
    if (tasks.length === 0) {
      setCurrentGif('/sprites/character-waiting.gif');
      setIsWalking(false);
      return;
    }
    
    if (pendingCount === 0 && tasks.length > 0) {
      setCurrentGif('/sprites/character-happy.gif');
      setIsWalking(false);
      return;
    }
    
    if (pendingCount > 0 && currentGif !== '/sprites/character-walking.gif') {
      setCurrentGif('/sprites/character-walking.gif');
      setIsWalking(true);
    }
    
  }, [tasks, hasWelcomed, skipNextMonitor]);

  // User actions
  useEffect(() => {
    if (!lastAction) return;
    
    console.log('Character action:', lastAction);
    setIsWalking(false);
    setSkipNextMonitor(true);
    
    switch(lastAction) {
      case 'task_welcome':
        setCurrentGif('/sprites/character-welcome.gif');
        break;
      case 'task_added':
        setCurrentGif('/sprites/character-excited.gif');
        showMessageBox('✨ New task!', 2000);
        break;
      case 'task_deleted':
        setCurrentGif('/sprites/character-shock.gif');
        showMessageBox('😲 Deleted', 1500);
        break;
      case 'task_edited':
        setCurrentGif('/sprites/character-happy.gif');
        showMessageBox('✅ Updated', 2000);
        break;
      case 'task_completed':
        setCurrentGif('/sprites/character-love.gif');
        showMessageBox('💖 Completed!', 2000);
        break;
      default:
        break;
    }
    
    setTimeout(() => {
      setSkipNextMonitor(false);
    }, 2500);
    
  }, [lastAction]);

  // Movement - disabled on mobile
  useEffect(() => {
    if (!isWalking || isMobile) return;
    
    const interval = setInterval(() => {
      setPosition(prev => {
        let newX = prev.x + (2 * direction);
        
        if (newX > window.innerWidth - CHARACTER_SIZE) {
          setDirection(-1);
          newX = window.innerWidth - CHARACTER_SIZE;
        }
        if (newX < -CHARACTER_SIZE) {
          setDirection(1);
          newX = -CHARACTER_SIZE;
        }
        
        return { ...prev, x: newX };
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [direction, isWalking, isMobile, CHARACTER_SIZE]);

  // Prevent accidental clicks with cooldown and area restriction
  const handleClick = (e) => {
    e.stopPropagation();
    
    if (clickCooldown) return;
    setClickCooldown(true);
    
    const responses = [
      '🐱 Meow!',
      `🌟 Great job!`,
      '📝 Add a task!',
      '🎉 Keep going!',
      '💖 You got this!'
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    showMessageBox(randomResponse, 1500);
    
    setTimeout(() => setClickCooldown(false), 2000);
  };

  // Position style based on device
  const getPositionStyle = () => {
    if (isMobile) {
      // Fixed position on mobile - bottom left corner
      return { bottom: '65px', left: '10px', right: 'auto' };
    }
    // Desktop - walking animation
    return { 
      bottom: '10px', 
      left: isWalking ? `${position.x}px` : '20px',
      transition: 'left 0.05s linear'
    };
  };

  return (
    <div 
      onClick={handleClick}
      style={{
        position: 'fixed',
        ...getPositionStyle(),
        zIndex: 999,
        cursor: isMobile ? 'pointer' : 'pointer',
        opacity: 0.95,
        transition: 'opacity 0.2s ease'
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.95'}
    >
      {/* Speech Bubble - Only show on desktop or short messages */}
      {showMessage && !isMobile && (
        <div style={{
          position: 'absolute',
          bottom: `${CHARACTER_SIZE + 8}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a1a2e',
          padding: '6px 12px',
          borderRadius: '20px',
          whiteSpace: 'nowrap',
          fontSize: '11px',
          fontWeight: 'bold',
          color: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          border: '1px solid #76ABAE',
          zIndex: 1001,
          pointerEvents: 'none'
        }}>
          {message}
          <div style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1a1a2e'
          }} />
        </div>
      )}
      
      {/* Character Image */}
      <img 
        src={currentGif} 
        alt="Character"
        style={{
          width: `${CHARACTER_SIZE}px`,
          height: `${CHARACTER_SIZE}px`,
          transform: !isMobile && direction === -1 ? 'scaleX(-1)' : 'scaleX(1)',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
          objectFit: 'contain',
          borderRadius: '10px',
          background: 'transparent',
          pointerEvents: 'auto'
        }}
        onError={(e) => {
          e.target.style.display = 'none';
          const parent = e.target.parentElement;
          const emoji = document.createElement('div');
          emoji.style.fontSize = `${CHARACTER_SIZE - 10}px`;
          emoji.style.width = `${CHARACTER_SIZE}px`;
          emoji.style.height = `${CHARACTER_SIZE}px`;
          emoji.style.display = 'flex';
          emoji.style.alignItems = 'center';
          emoji.style.justifyContent = 'center';
          
          if (currentGif.includes('sad')) emoji.textContent = '😢';
          else if (currentGif.includes('happy')) emoji.textContent = '😊';
          else if (currentGif.includes('love')) emoji.textContent = '💖';
          else if (currentGif.includes('shock')) emoji.textContent = '😲';
          else if (currentGif.includes('excited')) emoji.textContent = '🎉';
          else if (currentGif.includes('waiting')) emoji.textContent = '⏳';
          else if (currentGif.includes('welcome')) emoji.textContent = '🎊';
          else if (currentGif.includes('walking')) emoji.textContent = '🚶';
          else emoji.textContent = '🐱';
          
          parent.appendChild(emoji);
        }}
      />
    </div>
  );
}