import { useState, useEffect } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 500);
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <div className="splash-logo">
          <span className="logo-emoji">📚✨</span>
          <h1>TaskMaster</h1>
        </div>
        
        <div className="splash-animation">
          <div className="splash-ring">
            <div className="ring-segment"></div>
            <div className="ring-segment"></div>
            <div className="ring-segment"></div>
            <div className="ring-segment"></div>
          </div>
          <div className="splash-progress">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="splash-text">Loading amazing experience...</p>
          <p className="splash-percentage">{progress}%</p>
        </div>
        
        <div className="splash-footer">
          <p>Stay productive, stay focused</p>
        </div>
      </div>
    </div>
  );
}