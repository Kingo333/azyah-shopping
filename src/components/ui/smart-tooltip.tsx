import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SmartTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * SmartTooltip: Shows tooltip on desktop (hover), skips on mobile (touch).
 * This prevents the "first tap opens tooltip, second tap triggers action" problem.
 */
export function SmartTooltip({ children, content, side }: SmartTooltipProps) {
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  React.useEffect(() => {
    // Detect if device primarily uses touch/coarse pointer
    const isTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setIsTouchDevice(isTouch);
  }, []);

  // On touch devices, just render children without tooltip wrapper
  if (isTouchDevice) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
}
