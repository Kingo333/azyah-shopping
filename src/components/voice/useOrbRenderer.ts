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

      // Sound wave motion effects
      const soundWave1 = Math.sin(time * 0.03 + level * 10) * 0.05;
      const soundWave2 = Math.cos(time * 0.02 + level * 8) * 0.03;
      const breathe = 1 + Math.sin(time * 0.02) * 0.1;
      const pulse = 1 + Math.min(level * 3, 0.4);
      const radius = baseRadius * breathe * pulse;

      // Sound wave-affected center position
      const waveX = centerX + soundWave1 * baseRadius * level;
      const waveY = centerY + soundWave2 * baseRadius * level;

      // Create dynamic gradient with maroon and beige
      const gradient = ctx.createRadialGradient(
        waveX, waveY, radius * 0.1,
        waveX, waveY, radius
      );
      
      // Beautiful gradient using app's maroon and beige colors
      gradient.addColorStop(0, 'hsl(343, 75%, 95%)'); // Light beige/cream
      gradient.addColorStop(0.2, 'hsl(30, 40%, 85%)'); // Warm beige
      gradient.addColorStop(0.5, 'hsl(15, 35%, 75%)'); // Soft taupe
      gradient.addColorStop(0.7, 'hsl(343, 45%, 65%)'); // Muted maroon
      gradient.addColorStop(0.9, 'hsl(343, 75%, 32%)'); // Deep maroon
      gradient.addColorStop(1, 'transparent');

      // Draw main orb with wave motion
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(waveX, waveY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Add subtle outer glow when speaking with maroon tones
      if (level > 0.1) {
        const glowGradient = ctx.createRadialGradient(
          waveX, waveY, radius * 0.8,
          waveX, waveY, radius * 1.4
        );
        glowGradient.addColorStop(0, 'hsla(343, 75%, 42%, 0.3)');
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(waveX, waveY, radius * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add sparkle effects for high activity with warm tones
      if (level > 0.3) {
        for (let i = 0; i < 6; i++) {
          const angle = (time * 0.05 + i * Math.PI / 3) % (Math.PI * 2);
          const sparkleRadius = radius * 1.2;
          const sparkleX = waveX + Math.cos(angle) * sparkleRadius;
          const sparkleY = waveY + Math.sin(angle) * sparkleRadius;
          const size = 2 + Math.sin(time * 0.1 + i) * 1;
          
          // Alternate between cream and light maroon sparkles
          ctx.fillStyle = i % 2 === 0 ? 'hsl(343, 75%, 85%)' : 'hsl(30, 60%, 90%)';
          ctx.beginPath();
          ctx.arc(sparkleX, sparkleY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Add sound wave ripples for enhanced wave effect
      if (level > 0.2) {
        for (let i = 0; i < 3; i++) {
          const rippleRadius = radius * (1.5 + i * 0.3) * (1 + level);
          const opacity = (0.1 - i * 0.03) * level;
          
          ctx.strokeStyle = `hsla(343, 65%, 50%, ${opacity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(waveX, waveY, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();
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