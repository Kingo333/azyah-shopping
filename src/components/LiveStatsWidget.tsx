import { motion } from "framer-motion";
import { Users, ShoppingBag, Heart, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function LiveStatsWidget() {
  const [stats, setStats] = useState({
    users: 12547,
    products: 3421,
    likes: 89234,
    recommendations: 1256,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        users: prev.users + Math.floor(Math.random() * 3),
        products: prev.products + Math.floor(Math.random() * 2),
        likes: prev.likes + Math.floor(Math.random() * 5),
        recommendations: prev.recommendations + Math.floor(Math.random() * 4),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const statItems = [
    { icon: Users, label: "Active Users", value: stats.users.toLocaleString(), color: "text-blue-400" },
    { icon: ShoppingBag, label: "Products", value: stats.products.toLocaleString(), color: "text-green-400" },
    { icon: Heart, label: "Likes", value: stats.likes.toLocaleString(), color: "text-red-400" },
    { icon: Sparkles, label: "AI Matches", value: stats.recommendations.toLocaleString(), color: "text-purple-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
    >
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border border-primary/20 hover:border-primary/40 transition-all duration-300"
          >
            <div className="flex items-center space-x-3">
              <Icon className={`w-5 h-5 ${item.color}`} />
              <div>
                <motion.div 
                  className="text-lg font-bold text-foreground"
                  key={item.value}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {item.value}
                </motion.div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}