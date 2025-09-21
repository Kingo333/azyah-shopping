import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const activities = [
  { text: "Someone discovered their perfect style" },
  { text: "A user found items they love" },
  { text: "Someone joined the community" },
  { text: "A new style match was completed" },
  { text: "Someone posted their mood board" }
];

export function LiveActivityIndicator() {
  const [currentActivity, setCurrentActivity] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isClosed, setIsClosed] = useState(() => {
    return localStorage.getItem('activity-indicator-closed') === 'true';
  });

  const handleClose = () => {
    setIsClosed(true);
    localStorage.setItem('activity-indicator-closed', 'true');
  };

  useEffect(() => {
    const showActivity = () => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentActivity(Math.floor(Math.random() * activities.length));
        setIsVisible(true);
      }, 300);
      
      // Random interval between 15-20 seconds for more natural timing
      const nextInterval = Math.random() * 5000 + 15000;
      setTimeout(showActivity, nextInterval);
    };

    // Initial delay before first activity
    const initialDelay = Math.random() * 3000 + 2000;
    const initialTimer = setTimeout(showActivity, initialDelay);

    return () => clearTimeout(initialTimer);
  }, []);

  const activity = activities[currentActivity];

  if (isClosed) return null;

  return (
    <div className="fixed bottom-14 left-4 z-40 animate-slide-in-right">
      <div 
        className={`flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-1.5 sm:px-2 py-0.5 border border-white/20 transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <span className="text-[10px] sm:text-xs font-medium text-white">{activity.text}</span>
        <button
          onClick={handleClose}
          className="ml-1 text-white/60 hover:text-white transition-colors"
          aria-label="Close activity indicator"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}