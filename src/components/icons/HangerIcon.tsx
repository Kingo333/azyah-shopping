import React from 'react';

interface HangerIconProps {
  className?: string;
  size?: number;
}

export const HangerIcon: React.FC<HangerIconProps> = ({ className, size = 24 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V8" />
      <path d="M12 8L3 14h18L12 8z" />
      <path d="M3 14v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
    </svg>
  );
};

export default HangerIcon;
