import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  title: string;
  brand: string;
  price: number;
  image: string;
  category: string;
}

export function InteractiveProductPreview() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Mock products - in real app, these would come from your products hook
  const products: Product[] = [
    {
      id: "1",
      title: "Silk Evening Dress",
      brand: "Luxury Brand",
      price: 1299,
      image: "/marketing/hero-visual.png",
      category: "Dresses"
    },
    {
      id: "2", 
      title: "Designer Handbag",
      brand: "Premium Label",
      price: 899,
      image: "/marketing/hero-visual-square.png",
      category: "Accessories"
    },
    {
      id: "3",
      title: "Tailored Blazer",
      brand: "Modern Couture",
      price: 750,
      image: "/marketing/hero-visual-gender-neutral.png",
      category: "Outerwear"
    }
  ];

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPlaying, products.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % products.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
  };

  const currentProduct = products[currentIndex];

  return (
    <div className="relative bg-gradient-to-br from-background/95 to-primary/5 rounded-2xl p-6 border border-primary/20 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Featured Now</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrev}
            className="w-8 h-8 p-0 hover:bg-primary/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" 
            size="sm"
            onClick={goToNext}
            className="w-8 h-8 p-0 hover:bg-primary/10"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProduct.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center"
          >
            <div className="relative group">
              <motion.img
                src={currentProduct.image}
                alt={currentProduct.title}
                className="w-full h-48 object-cover rounded-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 w-8 h-8 p-0 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Heart className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-primary font-medium uppercase tracking-wide">
                  {currentProduct.category}
                </span>
                <h4 className="text-lg font-semibold text-foreground">
                  {currentProduct.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {currentProduct.brand}
                </p>
              </div>
              
              <div className="text-xl font-bold text-primary">
                ${currentProduct.price}
              </div>

              <Button 
                size="sm" 
                className="w-full group"
                variant="outline"
              >
                <span>View Details</span>
                <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress indicators */}
      <div className="flex justify-center space-x-2 mt-4">
        {products.map((_, index) => (
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