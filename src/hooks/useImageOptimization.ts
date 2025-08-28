import { useCallback } from 'react';

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg';
}

export const useImageOptimization = () => {
  const optimizeImage = useCallback(async (
    file: File, 
    options: ImageOptimizationOptions = {}
  ): Promise<File> => {
    const {
      maxWidth = 1024,
      maxHeight = 1024,
      quality = 0.8,
      format = 'webp'
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create optimized file
                const optimizedFile = new File(
                  [blob], 
                  `optimized_${file.name.split('.')[0]}.${format}`, 
                  { 
                    type: `image/${format}`,
                    lastModified: Date.now()
                  }
                );
                resolve(optimizedFile);
              } else {
                reject(new Error('Failed to create optimized image'));
              }
            },
            `image/${format}`,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const getOptimizedBase64 = useCallback(async (
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<string> => {
    const optimizedFile = await optimizeImage(file, options);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read optimized image'));
      reader.readAsDataURL(optimizedFile);
    });
  }, [optimizeImage]);

  return {
    optimizeImage,
    getOptimizedBase64
  };
};