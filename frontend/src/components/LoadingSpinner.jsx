import { useState, useEffect } from 'react';
import './LoadingSpinner.css';

const loadingMessages = [
  { text: 'Loading your tasks...', emoji: '📚', icon: '📖' },
  { text: 'Fetching your data...', emoji: '✨', icon: '⚡' },
  { text: 'Almost there...', emoji: '🎯', icon: '🎯' },
  { text: 'Waking up the character...', emoji: '🐱', icon: '😺' },
  { text: 'Getting things ready...', emoji: '📝', icon: '✏️' },
  { text: 'Just a moment...', emoji: '⏳', icon: '⌛' },
  { text: 'Preparing your dashboard...', emoji: '💫', icon: '📊' },
  { text: 'Almost done...', emoji: '🌟', icon: '⭐' }
];

export default function LoadingSpinner() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [bounceIndex, setBounceIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);
    
    const bounceInterval = setInterval(() => {
      setBounceIndex((prev) => (prev + 1) % 3);
    }, 500);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + 2;
      });
    }, 50);
    
    return () => {
      clearInterval(messageInterval);
      clearInterval(bounceInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const bouncingDots = '.'.repeat(bounceIndex + 1);

  return (
    <div className="loading-container-enhanced">
      <div className="loading-overlay"></div>
      
      <div className="loading-content">
        {/* Animated Ring with Pulsing Dots */}
        <div className="loading-ring-enhanced">
          <div className="ring-dot dot-1"></div>
          <div className="ring-dot dot-2"></div>
          <div className="ring-dot dot-3"></div>
          <div className="ring-dot dot-4"></div>
          <div className="ring-dot dot-5"></div>
          <div className="ring-dot dot-6"></div>
          <div className="ring-dot dot-7"></div>
          <div className="ring-dot dot-8"></div>
          <div className="loading-center-icon">
            {loadingMessages[messageIndex].emoji}
          </div>
        </div>
        
        {/* Animated Text */}
        <div className="loading-text-enhanced">
          {loadingMessages[messageIndex].text}
          <span className="loading-dots">{bouncingDots}</span>
        </div>
        
        {/* Progress Bar */}
        <div className="loading-progress-container">
          <div className="loading-progress-bar">
            <div 
              className="loading-progress-fill" 
              style={{ width: `${progress}%` }}
            >
              <div className="progress-glow"></div>
            </div>
          </div>
          <div className="loading-progress-text">{progress}%</div>
        </div>
        
        {/* Animated Subtext */}
        <div className="loading-subtext-enhanced">
          <span className="subtext-icon">{loadingMessages[messageIndex].icon}</span>
          <span className="subtext-text">Getting your tasks ready</span>
        </div>
        
        {/* Floating Shapes */}
        <div className="floating-shapes">
          <div className="floating-shape shape-1">📚</div>
          <div className="floating-shape shape-2">✨</div>
          <div className="floating-shape shape-3">🎯</div>
          <div className="floating-shape shape-4">🐱</div>
          <div className="floating-shape shape-5">📝</div>
        </div>
      </div>
    </div>
  );
}