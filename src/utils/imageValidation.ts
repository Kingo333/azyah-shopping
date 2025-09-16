// Image validation and testing utilities
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache'
    });
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch {
    return false;
  }
}

export async function testImageLoad(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
}

export function logImagePerformance(url: string, loadTime: number, success: boolean) {
  if (import.meta.env.DEV) {
    console.log(`Image ${success ? 'loaded' : 'failed'}: ${url} (${loadTime}ms)`);
  }
}