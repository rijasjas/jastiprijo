import { testSupabaseConnection, insertSampleProducts } from './sampleData';
import { initializePerformanceOptimizations } from './performance';
import { quickHealthCheck } from './featureTests';

/**
 * Initialize the application with all necessary setup
 */
export const initializeApp = async (): Promise<void> => {
  try {
    console.log('🚀 Initializing JastipRijo App...');
    
    // Initialize performance optimizations first
    initializePerformanceOptimizations();
    
    // Test Supabase connection
    const isConnected = await testSupabaseConnection();
    
    if (!isConnected) {
      console.warn('⚠️ Supabase connection failed, app will run in offline mode');
      return;
    }
    
    // Insert sample products if needed
    await insertSampleProducts();
    
    // Run health check
    const healthCheck = await quickHealthCheck();
    console.log(`🏥 App Health: ${healthCheck.status.toUpperCase()}`);
    
    console.log('✅ App initialization complete!');
    
  } catch (error) {
    console.error('❌ App initialization failed:', error);
    // Don't throw error to prevent app crash
    // App should still work in basic mode
  }
};

/**
 * Check if the app is properly initialized
 */
export const checkAppHealth = async (): Promise<{
  supabase: boolean;
  performance: boolean;
  data: boolean;
}> => {
  const health = {
    supabase: false,
    performance: false,
    data: false
  };
  
  try {
    // Check Supabase connection
    health.supabase = await testSupabaseConnection();
    
    // Check performance features
    health.performance = typeof window !== 'undefined' && 'performance' in window;
    
    // Check if we have data
    if (health.supabase) {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase.from('products').select('id').limit(1);
      health.data = (data && data.length > 0) || false;
    }
    
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  return health;
};
