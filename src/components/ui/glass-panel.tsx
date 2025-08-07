
import * as React from "react"
import { cn } from "@/lib/utils"

const GlassPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'subtle'
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base glass-morphism styles
      "relative backdrop-blur-[14px] backdrop-saturate-[160%] rounded-2xl",
      "border border-white/30 dark:border-black/35",
      "shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
      "will-change-[backdrop-filter]",
      // Background with proper opacity
      variant === 'default' 
        ? "bg-white/22 dark:bg-[rgba(15,15,18,0.24)]"
        : "bg-white/12 dark:bg-[rgba(15,15,18,0.16)]",
      // Hover states
      "hover:bg-white/28 dark:hover:bg-[rgba(15,15,18,0.30)]",
      "transition-colors duration-200",
      className
    )}
    {...props}
  />
))
GlassPanel.displayName = "GlassPanel"

export { GlassPanel }
