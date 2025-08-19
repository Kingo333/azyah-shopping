// Image utility functions for optimal processing
export async function downscaleImage(file: File, maxSize = 1024, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate optimal scaling
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      // Draw scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);

      // Convert to optimized data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select an image file' };
  }

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Image too large. Please choose a file under 10MB' };
  }

  // Check for unsupported formats
  if (file.type.includes('heic') || file.type.includes('heif')) {
    return { valid: false, error: 'HEIC/HEIF format not supported. Please use JPG or PNG' };
  }

  return { valid: true };
}