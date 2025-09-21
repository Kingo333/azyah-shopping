import { useState, useEffect } from 'react';

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

  return (
    <div className="fixed bottom-14 left-4 z-40 animate-slide-in-right">
      <div 
        className={`flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-primary/20 transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs text-muted-foreground">{activity.text}</span>
      </div>
    </div>
  );
}