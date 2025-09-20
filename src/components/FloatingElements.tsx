import { motion } from "framer-motion";
import { Sparkles, Heart, Star, Crown } from "lucide-react";

export function FloatingElements() {
  const elements = [
    { icon: Sparkles, delay: 0, x: "10%", y: "20%" },
    { icon: Heart, delay: 1, x: "85%", y: "15%" },
    { icon: Star, delay: 2, x: "15%", y: "80%" },
    { icon: Crown, delay: 0.5, x: "90%", y: "75%" },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {elements.map((element, index) => {
        const Icon = element.icon;
        return (
          <motion.div
            key={index}
            className="absolute"
            style={{ left: element.x, top: element.y }}
            initial={{ opacity: 0, scale: 0, rotate: 0 }}
            animate={{ 
              opacity: [0, 0.6, 0.3, 0.6],
              scale: [0, 1.2, 0.8, 1],
              rotate: [0, 360],
              y: [-20, 0, -10, 0]
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              delay: element.delay,
              ease: "easeInOut"
            }}
          >
            <Icon className="w-6 h-6 text-primary/30" />
          </motion.div>
        );
      })}
    </div>
  );
}

export function ParticleBackground() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 10,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute bg-primary/20 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}