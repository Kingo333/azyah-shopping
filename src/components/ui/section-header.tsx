import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  action?: React.ReactNode
  onAction?: () => void
  actionLabel?: string
}

const SectionHeader = React.forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, title, action, onAction, actionLabel = "View All", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between py-2", className)}
      {...props}
    >
      <h2 className="text-base font-serif font-medium text-foreground tracking-tight">
        {title}
      </h2>
      {action ? (
        action
      ) : onAction ? (
        <button
          onClick={onAction}
          className="flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
)
SectionHeader.displayName = "SectionHeader"

export { SectionHeader }