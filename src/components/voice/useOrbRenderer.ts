import { useEffect } from 'react';

export function useOrbRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  level: number,
  isActive: boolean = true
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let time = 0;

    const draw = () => {
      const { clientWidth: width, clientHeight: height } = canvas;
      canvas.width = width;
      canvas.height = height;

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.25;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw static orb when inactive
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, baseRadius
        );
        gradient.addColorStop(0, 'hsl(var(--muted-foreground))');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      // Breathing animation based on mic level
      const breathe = 1 + Math.sin(time * 0.02) * 0.1;
      const pulse = 1 + Math.min(level * 3, 0.4);
      const radius = baseRadius * breathe * pulse;

      // Create dynamic gradient
      const gradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.1,
        centerX, centerY, radius
      );
      
      // Beautiful gradient using app's maroon and beige theme
      gradient.addColorStop(0, 'hsl(var(--primary-foreground))');
      gradient.addColorStop(0.3, 'hsl(var(--primary-glow))');
      gradient.addColorStop(0.6, 'hsl(var(--accent-cartier) / 0.7)');
      gradient.addColorStop(0.9, 'hsl(var(--accent-cartier))');
      gradient.addColorStop(1, 'transparent');

      // Draw main orb
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Add subtle outer glow when speaking
      if (level > 0.1) {
        const glowGradient = ctx.createRadialGradient(
          centerX, centerY, radius * 0.8,
          centerX, centerY, radius * 1.4
        );
        glowGradient.addColorStop(0, 'hsl(var(--accent-cartier) / 0.3)');
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add sparkle effects for high activity
      if (level > 0.3) {
        ctx.fillStyle = 'hsl(var(--primary-foreground))';
        for (let i = 0; i < 6; i++) {
          const angle = (time * 0.05 + i * Math.PI / 3) % (Math.PI * 2);
          const sparkleRadius = radius * 1.2;
          const x = centerX + Math.cos(angle) * sparkleRadius;
          const y = centerY + Math.sin(angle) * sparkleRadius;
          const size = 2 + Math.sin(time * 0.1 + i) * 1;
          
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      time += 1;
      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [canvasRef, level, isActive]);
}