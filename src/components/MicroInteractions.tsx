import { motion } from "framer-motion";
import { ReactNode } from "react";

interface RippleButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  style?: React.CSSProperties;
}

export function RippleButton({ children, className = "", onClick, variant = "primary", style }: RippleButtonProps) {
  const baseStyles = "relative overflow-hidden rounded-lg font-medium transition-all duration-300";
  
  const variantStyles = {
    primary: "bg-gradient-to-r from-primary to-primary/90 text-white hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
  };

  return (
    <motion.button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      onClick={onClick}
      style={style}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="relative z-10">{children}</span>
      <motion.div
        className="absolute inset-0 bg-white/20 rounded-full"
        initial={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 4, opacity: [0, 1, 0] }}
        transition={{ duration: 0.3 }}
        style={{ originX: 0.5, originY: 0.5 }}
      />
    </motion.button>
  );
}

interface HoverCardProps {
  children: ReactNode;
  className?: string;
}

export function HoverCard({ children, className = "" }: HoverCardProps) {
  return (
    <motion.div
      className={`group ${className}`}
      whileHover={{ y: -5, rotateX: 5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div
        className="relative"
        whileHover={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
        transition={{ duration: 0.3 }}
      >
        {children}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"
          initial={false}
        />
      </motion.div>
    </motion.div>
  );
}

interface PulseElementProps {
  children: ReactNode;
  className?: string;
  intensity?: "low" | "medium" | "high";
}

export function PulseElement({ children, className = "", intensity = "medium" }: PulseElementProps) {
  const intensityMap = {
    low: { scale: [1, 1.02, 1], duration: 3 },
    medium: { scale: [1, 1.05, 1], duration: 2.5 },
    high: { scale: [1, 1.08, 1], duration: 2 }
  };

  return (
    <motion.div
      className={className}
      animate={intensityMap[intensity].scale ? { scale: intensityMap[intensity].scale } : {}}
      transition={{
        duration: intensityMap[intensity].duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}

interface ShimmerTextProps {
  children: ReactNode;
  className?: string;
}

export function ShimmerText({ children, className = "" }: ShimmerTextProps) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 3
        }}
        style={{ transform: "skewX(-25deg)" }}
      />
    </span>
  );
}