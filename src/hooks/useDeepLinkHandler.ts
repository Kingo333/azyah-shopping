import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Deep link handler for Capacitor iOS/Android apps.
 * Listens for appUrlOpen events and routes to the correct path.
 * 
 * Handles URLs like:
 * - com.azyah.style://auth/callback#access_token=...&type=signup
 * - com.azyah.style://auth/callback#access_token=...&type=recovery
 */
export const useDeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Only set up listener on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleAppUrlOpen = async (event: { url: string }) => {
      console.log('Deep link received:', event.url);
      
      try {
        const url = new URL(event.url);
        
        // Extract the path from the URL
        // For com.azyah.style://auth/callback#..., pathname will be /auth/callback
        let path = url.pathname || '/';
        
        // Handle case where pathname might be empty for custom schemes
        if (!path || path === '/') {
          // Try to extract path from host (some URL parsers put it there for custom schemes)
          if (url.host && url.host.includes('/')) {
            path = '/' + url.host.split('/').slice(1).join('/');
          } else if (url.href.includes('://')) {
            // Extract path manually from URL
            const afterScheme = url.href.split('://')[1];
            if (afterScheme) {
              const pathPart = afterScheme.split('#')[0].split('?')[0];
              if (pathPart && pathPart !== url.host) {
                path = '/' + pathPart.replace(url.host, '').replace(/^\//, '');
              }
            }
          }
        }
        
        // Get hash fragment (contains Supabase tokens)
        const hash = url.hash || '';
        
        // Construct the full path with hash
        const fullPath = path + hash;
        
        console.log('Deep link navigating to:', fullPath);
        
        // Special handling for Style Link paths
        if (fullPath.startsWith('/u/') || fullPath.startsWith('u/')) {
          const normalizedPath = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
          navigate(normalizedPath, { replace: true });
          return;
        }
        
        // Navigate to the path (handles /auth/callback, /share/outfit/:id, /share/item/:id, etc.)
        navigate(fullPath, { replace: true });
      } catch (error) {
        console.error('Error parsing deep link:', error);
        // Fallback: navigate to home
        navigate('/', { replace: true });
      }
    };

    // Add the listener
    const listenerPromise = App.addListener('appUrlOpen', handleAppUrlOpen);

    // Cleanup on unmount
    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [navigate]);
};
