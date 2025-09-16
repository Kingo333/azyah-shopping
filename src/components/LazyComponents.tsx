import { lazy } from 'react';

// Code splitting for heavy components
export const AiStudioModal = lazy(() => import('./AiStudioModal'));
export const ARTryOnPage = lazy(() => import('../pages/ARTryOn'));

// Brand/Retailer portal components  
export const BrandPortal = lazy(() => import('../pages/BrandPortal'));
export const RetailerPortal = lazy(() => import('../pages/RetailerPortal'));

// Simple lazy wrapper for components that may not have default exports
const createLazyComponent = (importFn: () => Promise<any>, componentName: string) => 
  lazy(() => importFn().then(module => ({ 
    default: module.default || module[componentName] || (() => null)
  })));

// Voice components
export const VoicePanel = createLazyComponent(() => import('./VoicePanel'), 'VoicePanel');
export const EnhancedVoicePanel = createLazyComponent(() => import('./EnhancedVoicePanel'), 'EnhancedVoicePanel');

// Dashboard components
export const AnalyticsDashboard = createLazyComponent(() => import('./AnalyticsDashboard'), 'AnalyticsDashboard');
export const MoodBoardBuilder = createLazyComponent(() => import('./MoodBoardBuilder'), 'MoodBoardBuilder');
export const PersonalizationEngine = createLazyComponent(() => import('./PersonalizationEngine'), 'PersonalizationEngine');

// UGC components
export const UGCCollabModal = createLazyComponent(() => import('./ugc/UGCCollabModal'), 'UGCCollabModal');
export const CollabDashboard = createLazyComponent(() => import('./ugc/CollabDashboard'), 'CollabDashboard');
export const CreateCollabWizard = createLazyComponent(() => import('./ugc/CreateCollabWizard'), 'CreateCollabWizard');

// Advanced features
export const ToyReplicaUploader = createLazyComponent(() => import('./ToyReplicaUploader'), 'ToyReplicaUploader');
export const DocumentUpload = createLazyComponent(() => import('./DocumentUpload'), 'DocumentUpload');
export const PaymentButton = createLazyComponent(() => import('./PaymentButton'), 'PaymentButton');

// Fallback component for lazy loading
export const ComponentFallback = ({ className }: { className?: string }) => (
  <div className={`flex items-center justify-center p-8 ${className || ''}`}>
    <div className="text-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);