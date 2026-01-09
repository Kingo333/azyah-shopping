import { useState, useEffect, useMemo } from 'react';

/**
 * Hook to safely manage a single object URL with automatic cleanup
 * Prevents memory leaks from unreleased object URLs
 */
export const useObjectUrl = (file: File | null): string | null => {
  const [url, setUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);
  
  return url;
};

/**
 * Hook to safely manage multiple object URLs with automatic cleanup
 * Used for components with multiple file previews (e.g., bulk upload)
 */
export const useObjectUrls = (files: File[]): string[] => {
  // Create a stable key from files to detect actual changes
  const filesKey = useMemo(() => {
    return files.map(f => `${f.name}-${f.size}-${f.lastModified}`).join('|');
  }, [files]);

  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    // Create new object URLs
    const newUrls = files.map(file => URL.createObjectURL(file));
    setUrls(newUrls);
    
    // Cleanup: revoke all URLs when files change or component unmounts
    return () => {
      newUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [filesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return urls;
};

export default useObjectUrl;
