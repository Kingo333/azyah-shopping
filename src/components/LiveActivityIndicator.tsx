import { useState, useEffect } from 'react';

const activities = [
  { text: "Someone discovered their perfect style" },
  { text: "A user found items they love" },
  { text: "Someone joined the community" },
  { text: "A new style match was completed" },
  { text: "Someone created a new wishlist" }
];

export function LiveActivityIndicator() {
  const [currentActivity, setCurrentActivity] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentActivity(prev => (prev + 1) % activities.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const activity = activities[currentActivity];

  return (
    <div className="fixed top-20 right-4 z-40 animate-slide-in-right">
      <div 
        className={`flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-primary/20 transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm text-muted-foreground">{activity.text}</span>
      </div>
    </div>
  );
}