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
      <path d="M12 2a2 2 0 0 0-2 2c0 .74.4 1.39 1 1.73V7l-7 5.5c-1.21.81-1.21 2.74 0 3.5l7.5 5a2 2 0 0 0 2.5 0l7.5-5c1.21-.76 1.21-2.69 0-3.5L14 7V5.73c.6-.34 1-.99 1-1.73a2 2 0 0 0-2-2z" />
    </svg>
  );
};

export default HangerIcon;
