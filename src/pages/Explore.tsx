import React from 'react';
import { ExploreGlobe } from '@/components/globe/ExploreGlobe';

/**
 * Explore Page - Globe-First Discovery
 * 
 * The explore page is now a full-screen interactive globe where users can:
 * - Tap countries to discover brands from that region
 * - Search by country name
 * - See featured countries based on engagement
 * - Open a drawer with brand details and navigation to swipe/list views
 */
const Explore: React.FC = () => {
  return <ExploreGlobe />;
};

export default Explore;
