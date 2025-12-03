import { supabase } from '@/integrations/supabase/client';

export async function testDatabaseTables() {
  console.log('🔍 Testing database tables...');
  
  try {
    // Test orders table
    console.log('1. Testing orders table...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (ordersError) {
      console.error('❌ Orders table error:', ordersError);
      return { orders: false, orderItems: false, error: ordersError.message };
    }
    console.log('✅ Orders table accessible');

    // Test order_items table
    console.log('2. Testing order_items table...');
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*')
      .limit(1);
    
    if (orderItemsError) {
      console.error('❌ Order items table error:', orderItemsError);
      return { orders: true, orderItems: false, error: orderItemsError.message };
    }
    console.log('✅ Order items table accessible');

    // Test products table
    console.log('3. Testing products table...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (productsError) {
      console.error('❌ Products table error:', productsError);
      return { orders: true, orderItems: true, products: false, error: productsError.message };
    }
    console.log('✅ Products table accessible');

    return { orders: true, orderItems: true, products: true, error: null };

  } catch (error) {
    console.error('❌ Database test failed:', error);
    return { orders: false, orderItems: false, products: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
