import React from 'react';

interface ProgressBarProps {
  progress: number;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label }) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <div className="progress-bar-container" data-testid="progress-bar-container">
      {label && <div className="progress-label" data-testid="progress-label">{label}</div>}
      <div className="progress-bar-outer" data-testid="progress-bar-outer">
        <div 
          className="progress-bar-inner" 
          style={{ width: `${clampedProgress}%` }}
          data-testid="progress-bar-inner"
        >
          {clampedProgress > 10 && (
            <span className="progress-text" data-testid="progress-text">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      </div>
      
      <style>{`
        .progress-bar-container {
          margin: 15px 0;
          width: 100%;
          padding: 0 16px 16px;
        }
        
        .progress-label {
          margin-bottom: 5px;
          font-size: 14px;
          color: #555;
        }
        
        .progress-bar-outer {
          height: 20px;
          background-color: #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .progress-bar-inner {
          height: 100%;
          background: linear-gradient(90deg, #4a8df8 0%, #2196f3 100%);
          border-radius: 10px;
          transition: width 0.5s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .progress-text {
          color: white;
          font-size: 12px;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        @keyframes progress {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
