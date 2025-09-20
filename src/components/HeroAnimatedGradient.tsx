import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function HeroAnimatedGradient() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(239,68,68,0.15), transparent 40%)`,
        }}
        animate={{
          background: [
            `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(239,68,68,0.15), transparent 40%)`,
            `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(168,85,247,0.1), transparent 40%)`,
            `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(239,68,68,0.15), transparent 40%)`,
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Secondary gradient for depth */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 80% 20%, rgba(168,85,247,0.1), transparent 50%)",
            "radial-gradient(circle at 20% 80%, rgba(59,130,246,0.08), transparent 50%)",
            "radial-gradient(circle at 80% 20%, rgba(168,85,247,0.1), transparent 50%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ transform: "translateX(-100%) skewX(-25deg)" }}
      />
    </div>
  );
}