import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import QuickActionsSheet from '@/components/quick-actions/QuickActionsSheet';

interface MainNavProps {
  setAiStudioModalOpen: (open: boolean) => void;
  handleToyReplicaClick: () => void;
}

export default function MainNav({ 
  setAiStudioModalOpen, 
  handleToyReplicaClick 
}: MainNavProps) {
  return (
    <>
      {/* Existing Dashboard Header */}
      <DashboardHeader />
      
      {/* Dashboard Navigation Button - positioned after header */}
      <div className="flex justify-center py-2 border-b border-border/50">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`
          }
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>
      </div>

      {/* Quick Actions Sheet - centered below navigation */}
      <QuickActionsSheet 
        setAiStudioModalOpen={setAiStudioModalOpen}
        handleToyReplicaClick={handleToyReplicaClick}
      />
    </>
  );
}
