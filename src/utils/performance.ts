
// Performance monitoring and optimization utilities
export const measurePageLoad = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      
      console.log(`📊 Page Load Performance:`);
      console.log(`   Load Time: ${loadTime}ms`);
      console.log(`   DOM Content Loaded: ${domContentLoaded}ms`);
      
      // Performance warnings
      if (loadTime > 3000) {
        console.warn('⚠️ Page load time is slow (>3s)');
      }
      if (domContentLoaded > 2000) {
        console.warn('⚠️ DOM content loaded is slow (>2s)');
      }
    }
  }
};

export const measureApiCall = async (apiName: string, apiCall: () => Promise<any>) => {
  const startTime = performance.now();
  try {
    const result = await apiCall();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`🚀 API Call: ${apiName} - ${duration.toFixed(2)}ms`);
    
    if (duration > 1000) {
      console.warn(`⚠️ Slow API call: ${apiName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.error(`❌ API Error: ${apiName} - ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};

// Enhanced image loading with caching and optimization
export const measureImageLoad = (imageUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const img = new Image();
    
    // Set loading priority for critical images
    if (imageUrl.includes('logo') || imageUrl.includes('hero')) {
      img.loading = 'eager';
    } else {
      img.loading = 'lazy';
    }
    
    // Add crossOrigin for external images
    if (imageUrl.includes('supabase.co') || imageUrl.includes('http')) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`🖼️ Image loaded: ${imageUrl} - ${duration.toFixed(2)}ms`);
      
      if (duration > 1000) {
        console.warn(`⚠️ Slow image load: ${imageUrl} took ${duration.toFixed(2)}ms`);
      }
      
      // Cache the image in memory for faster subsequent loads
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.open('image-cache').then(cache => {
          cache.put(imageUrl, new Response(img.src));
        }).catch(() => {
          // Silently fail if caching is not supported
        });
      }
      
      resolve();
    };
    
    img.onerror = () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error(`❌ Image failed: ${imageUrl} - ${duration.toFixed(2)}ms`);
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
};

export const getPerformanceMetrics = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
    };
  }
  return null;
};

export const logPerformanceWarnings = () => {
  const metrics = getPerformanceMetrics();
  if (metrics) {
    if (metrics.loadTime > 3000) {
      console.warn('⚠️ Performance Warning: Page load time is slow');
    }
    if (metrics.domContentLoaded > 2000) {
      console.warn('⚠️ Performance Warning: DOM content loaded is slow');
    }
    if (metrics.firstPaint > 1000) {
      console.warn('⚠️ Performance Warning: First paint is slow');
    }
  }
};

// Enhanced image optimization with better lazy loading
export const optimizeImages = () => {
  // Lazy load all images with intersection observer
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          // Preload image before setting src
          const preloadImg = new Image();
          preloadImg.onload = () => {
            img.src = src;
            img.classList.remove('lazy');
            img.classList.add('loaded');
          };
          preloadImg.src = src;
        }
        
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px', // Start loading 50px before image enters viewport
    threshold: 0.1
  });
  
  images.forEach(img => imageObserver.observe(img));
};

// Enhanced debounce with better memory management
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Enhanced throttle with better performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Enhanced preload with priority hints
export const preloadCriticalResources = () => {
  const criticalResources = [
    // Only preload truly critical resources
    { url: '/logoR.png', priority: 'high' }
  ];
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = resource.url.endsWith('.svg') ? 'image' : 'image';
    link.href = resource.url;
    if (resource.priority === 'high') {
      link.setAttribute('importance', 'high');
    }
    document.head.appendChild(link);
  });
};

// Enhanced scroll optimization with passive listeners
export const optimizeScroll = () => {
  let ticking = false;
  
  const updateScroll = () => {
    // Update scroll-based animations here
    ticking = false;
  };
  
  const requestTick = () => {
    if (!ticking) {
      requestAnimationFrame(updateScroll);
      ticking = true;
    }
  };
  
  window.addEventListener('scroll', requestTick, { passive: true });
};

// Memory optimization utilities
export const optimizeMemory = () => {
  // Clear unused event listeners
  const cleanupEventListeners = () => {
    // This is a placeholder for memory cleanup
    // In a real app, you'd track and remove unused listeners
  };
  
  // Optimize image memory usage
  const optimizeImageMemory = () => {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Set appropriate loading attributes
      if (!img.loading) {
        img.loading = 'lazy';
      }
      
      // Remove srcset for non-critical images to save memory
      if (img.srcset && !img.classList.contains('critical')) {
        img.removeAttribute('srcset');
      }
    });
  };
  
  // Run memory optimizations
  cleanupEventListeners();
  optimizeImageMemory();
};

// Image compression and optimization
export const optimizeImageUrl = (url: string, width?: number, quality?: number): string => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  // For Supabase storage URLs, we can add transformation parameters
  if (url.includes('supabase.co') && url.includes('storage')) {
    const params = new URLSearchParams();
    if (width) params.append('width', width.toString());
    if (quality) params.append('quality', quality.toString());
    
    if (params.toString()) {
      return `${url}?${params.toString()}`;
    }
  }
  
  return url;
};

// Initialize all performance optimizations
export const initializePerformanceOptimizations = () => {
  console.log('🚀 Initializing enhanced performance optimizations...');
  
  // Preload critical resources
  preloadCriticalResources();
  
  // Optimize scroll performance
  optimizeScroll();
  
  // Optimize memory usage
  optimizeMemory();
  
  // Measure initial page load
  measurePageLoad();
  
  // Log performance warnings
  setTimeout(logPerformanceWarnings, 1000);
  
  // Initialize image optimization after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeImages);
  } else {
    optimizeImages();
  }
  
  console.log('✅ Enhanced performance optimizations initialized');
};
