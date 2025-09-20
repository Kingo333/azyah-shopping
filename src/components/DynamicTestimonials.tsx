import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string;
  location: string;
}

export function DynamicTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials: Testimonial[] = [
    {
      id: "1",
      name: "Sarah Chen",
      role: "Fashion Influencer",
      content: "Azyah's AI recommendations are incredibly accurate. It's like having a personal stylist who truly understands my taste.",
      rating: 5,
      avatar: "/marketing/hero-visual.png",
      location: "New York"
    },
    {
      id: "2",
      name: "Emma Rodriguez", 
      role: "Creative Director",
      content: "The curation quality is exceptional. Every piece feels hand-picked for my style. It's revolutionized how I discover fashion.",
      rating: 5,
      avatar: "/marketing/hero-visual-square.png",
      location: "London"
    },
    {
      id: "3",
      name: "Alex Thompson",
      role: "Fashion Enthusiast",
      content: "Finally, a platform that gets it right. The AI learns your preferences and keeps getting better. Absolutely love it!",
      rating: 5,
      avatar: "/marketing/hero-visual-gender-neutral.png",
      location: "Paris"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className="bg-gradient-to-br from-primary/5 to-background rounded-2xl p-6 lg:p-8 border border-primary/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">What Our Users Say</h3>
        <Quote className="w-6 h-6 text-primary/40" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentTestimonial.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* Rating */}
          <div className="flex items-center space-x-1">
            {[...Array(currentTestimonial.rating)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>

          {/* Content */}
          <blockquote className="text-foreground leading-relaxed">
            "{currentTestimonial.content}"
          </blockquote>

          {/* Author */}
          <div className="flex items-center space-x-3 pt-4 border-t border-primary/10">
            <motion.img
              src={currentTestimonial.avatar}
              alt={currentTestimonial.name}
              className="w-12 h-12 rounded-full object-cover"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            />
            <div>
              <div className="font-medium text-foreground">
                {currentTestimonial.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentTestimonial.role} • {currentTestimonial.location}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Indicators */}
      <div className="flex justify-center space-x-2 mt-6">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? "bg-primary" : "bg-primary/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}