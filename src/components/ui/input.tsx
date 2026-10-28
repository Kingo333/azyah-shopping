import * as React from "react"

import { cn } from "@/lib/utils"
import { v3Defaults } from "@/lib/v3Classes"

// Design v3: filled field, no border, unless the caller styles it.
const INPUT_V3 = [
  { when: ["bg-"], add: "v3:bg-fill" },
  { when: ["border"], add: "v3:border-transparent" },
  { when: ["rounded"], add: "v3:rounded-[10px]" },
]

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          v3Defaults(className, INPUT_V3),
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
