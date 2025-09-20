import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, ArrowRight, Heart, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function FloatingActionButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { icon: User, label: "Sign Up", action: () => navigate("/auth") },
    { icon: Search, label: "Explore", action: () => navigate("/auth") },
    { icon: Heart, label: "Wishlist", action: () => navigate("/auth") },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col space-y-3 mb-3"
          >
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Button
                    variant="outline"
                    className="bg-background/95 backdrop-blur-sm border-primary/20 hover:border-primary/40 shadow-lg group"
                    onClick={action.action}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    <span className="text-sm">{action.label}</span>
                    <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="w-6 h-6" />
          </motion.div>
        </Button>
      </motion.div>
    </div>
  );
}