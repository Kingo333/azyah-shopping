import React from 'react';
import ToyReplicaPage from '@/pages/ToyReplica';

interface ToySectionProps {
  onToyReplicaClick: () => void;
}

const ToySection: React.FC<ToySectionProps> = ({ onToyReplicaClick }) => {
  return (
    <div className="w-full">
      <ToyReplicaPage />
    </div>
  );
};

export default ToySection;