import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
  staggerDelay?: number;
  animationType?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale-bounce' | 'rotate-in' | 'blur-focus';
}

export const useScrollAnimation = (options: ScrollAnimationOptions = {}) => {
  const {
    threshold = 0.2,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
    delay = 0,
    animationType = 'fade-up'
  } = options;

  const [hasAnimated, setHasAnimated] = useState(false);
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (inView && !hasAnimated) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setHasAnimated(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [inView, hasAnimated, delay]);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const getAnimationClasses = () => {
    if (prefersReducedMotion) {
      return isVisible ? 'opacity-100' : 'opacity-0';
    }

    const baseClasses = 'transition-all duration-700 ease-out';
    
    if (!isVisible) {
      switch (animationType) {
        case 'fade-up':
          return `${baseClasses} opacity-0 translate-y-8`;
        case 'fade-down':
          return `${baseClasses} opacity-0 -translate-y-8`;
        case 'fade-left':
          return `${baseClasses} opacity-0 translate-x-8`;
        case 'fade-right':
          return `${baseClasses} opacity-0 -translate-x-8`;
        case 'scale-bounce':
          return `${baseClasses} opacity-0 scale-95`;
        case 'rotate-in':
          return `${baseClasses} opacity-0 rotate-3 scale-95`;
        case 'blur-focus':
          return `${baseClasses} opacity-0 blur-sm scale-105`;
        default:
          return `${baseClasses} opacity-0 translate-y-8`;
      }
    }

    return `${baseClasses} opacity-100 translate-y-0 translate-x-0 scale-100 rotate-0 blur-0`;
  };

  return {
    ref,
    isVisible,
    animationClasses: getAnimationClasses(),
    inView
  };
};

export const useStaggeredScrollAnimation = (
  count: number, 
  options: ScrollAnimationOptions = {}
) => {
  const { staggerDelay = 100, ...restOptions } = options;
  
  const animations = Array.from({ length: count }, (_, index) => 
    useScrollAnimation({
      ...restOptions,
      delay: (restOptions.delay || 0) + (index * staggerDelay)
    })
  );

  return animations;
};