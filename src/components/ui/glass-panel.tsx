
import * as React from "react"
import { cn } from "@/lib/utils"

const GlassPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'premium' | 'subtle'
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base glass-morphism styles with premium effects
      "relative rounded-3xl will-change-[backdrop-filter]",
      // Enhanced backdrop filters for premium look
      "backdrop-blur-[24px] backdrop-saturate-[180%]",
      
      // Variant-specific styles
      variant === 'premium' && [
        "glass-premium",
        "border-2 border-white/20 dark:border-white/10",
        "shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]",
        "hover:shadow-[0_12px_50px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_12px_50px_rgba(0,0,0,0.4)]",
        "hover:backdrop-blur-[28px]",
        "premium-hover"
      ],
      
      variant === 'default' && [
        "bg-white/15 dark:bg-black/20",
        "border border-white/25 dark:border-white/10", 
        "shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]",
        "hover:bg-white/20 dark:hover:bg-black/25",
        "hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
        "hover:scale-[1.01]"
      ],
      
      variant === 'subtle' && [
        "bg-white/8 dark:bg-black/15",
        "border border-white/15 dark:border-white/8",
        "shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]",
        "hover:bg-white/12 dark:hover:bg-black/20"
      ],
      
      // Smooth transitions for all variants
      "transition-all duration-300 ease-out",
      className
    )}
    {...props}
  />
))
GlassPanel.displayName = "GlassPanel"

export { GlassPanel }
