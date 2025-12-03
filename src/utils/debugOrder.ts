import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';
import { testDatabaseTables } from './testDatabase';

export async function debugOrderCreation() {
  console.log('🔍 Debug Order Creation...');
  
  try {
    // Test 1: Check database tables
    console.log('1. Testing database tables...');
    const dbTest = await testDatabaseTables();
    
    if (!dbTest.orders || !dbTest.orderItems || !dbTest.products) {
      console.error('❌ Database tables not accessible:', dbTest.error);
      return false;
    }
    console.log('✅ All database tables accessible');

    // Test 2: Try to create a test order
    console.log('2. Testing order creation...');
    const testOrder: Order = {
      id: `test-${Date.now()}`,
      customerName: 'Test Customer',
      customerPhone: '0812345678',
      items: [],
      subtotalIdr: 0,
      createdAt: new Date().toISOString(),
      status: 'PENDING_PROOF'
    };

    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: testOrder.id,
        customer_name: testOrder.customerName,
        customer_phone: testOrder.customerPhone,
        subtotal_idr: testOrder.subtotalIdr,
        status: testOrder.status
      });

    if (orderError) {
      console.error('❌ Order creation failed:', orderError);
      return false;
    }
    console.log('✅ Test order created successfully');

    // Clean up test order
    await supabase
      .from('orders')
      .delete()
      .eq('id', testOrder.id);

    console.log('✅ All tests passed! Order creation should work.');
    return true;

  } catch (error) {
    console.error('❌ Debug failed:', error);
    return false;
  }
}
