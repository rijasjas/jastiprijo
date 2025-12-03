import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem } from '@/types';

export async function createTestOrder() {
  console.log('🧪 Creating test order manually...');
  
  try {
    const orderId = `manual-test-${Date.now()}`;
    
    // Create test order
    const order: Order = {
      id: orderId,
      customerName: 'Test Customer Manual',
      customerPhone: '0812345678',
      items: [
        {
          id: `${orderId}-test-product`,
          productId: 'test-product-id',
          nameSnapshot: 'Test Product',
          priceSnapshotIdr: 10000,
          quantity: 1,
          lineTotalIdr: 10000
        }
      ],
      subtotalIdr: 10000,
      createdAt: new Date().toISOString(),
      status: 'PENDING_PROOF'
    };

    console.log('📝 Order data:', order);

    // Insert order
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        id: order.id,
        customer_name: order.customerName,
        customer_phone: order.customerPhone,
        subtotal_idr: order.subtotalIdr,
        status: order.status
      });

    if (orderError) {
      console.error('❌ Order insert failed:', orderError);
      return { success: false, error: orderError.message };
    }
    console.log('✅ Order inserted successfully');

    // Insert order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        order.items.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          name_snapshot: item.nameSnapshot,
          price_snapshot_idr: item.priceSnapshotIdr,
          quantity: item.quantity,
          line_total_idr: item.lineTotalIdr
        }))
      );

    if (itemsError) {
      console.error('❌ Order items insert failed:', itemsError);
      return { success: false, error: itemsError.message };
    }
    console.log('✅ Order items inserted successfully');

    // Clean up
    await supabase.from('order_items').delete().eq('order_id', orderId);
    await supabase.from('orders').delete().eq('id', orderId);
    console.log('✅ Test order cleaned up');

    return { success: true, error: null };

  } catch (error) {
    console.error('❌ Manual test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
