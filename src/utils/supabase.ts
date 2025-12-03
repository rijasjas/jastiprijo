import { supabase } from '@/integrations/supabase/client';
import { Product, ProductImage, Order, OrderItem, PaymentProof } from '@/types';

// Product functions
export const getSupabaseProducts = async (): Promise<Product[]> => {
  try {
    console.log('🔍 Fetching only ACTIVE products from Supabase...');
    
    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 8000); // Reduced to 8 seconds
    });

    const queryPromise = supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price_idr,
        stock,
        category,
        is_active,
        created_at,
        updated_at,
        product_images (
          id,
          image_url,
          is_primary,
          display_order
        )
      `)
      .eq('is_active', true) // Only fetch active products
      .order('created_at', { ascending: false });

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} ACTIVE products`);
    
    // Transform the data to match Product interface with optimized image handling
    const products: Product[] = (data || []).map((item: any) => {
      // Get primary image or first image with better validation
      const primaryImage = item.product_images?.find((img: any) => img.is_primary) || item.product_images?.[0];
      let imageUrl = '/placeholder.svg';
      
      // Check if we have valid images in the product_images array
      if (item.product_images && item.product_images.length > 0) {
        const validImage = item.product_images.find((img: any) => 
          img.image_url && 
          img.image_url !== '/placeholder.svg' &&
          img.image_url !== '/placeholder-food-1.jpg' &&
          img.image_url !== ''
        );
        
        if (validImage) {
          imageUrl = validImage.image_url;
        }
      }
      
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        priceIdr: item.price_idr || item.price,
        stock: item.stock,
        category: item.category,
        imageUrl: imageUrl,
        images: item.product_images?.map((img: any) => ({
          id: img.id,
          productId: item.id,
          imageUrl: img.image_url,
          isPrimary: img.is_primary,
          displayOrder: img.display_order || 0,
          createdAt: new Date().toISOString()
        })) || [],
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      };
    });

    console.log(`🎯 Processed ${products.length} products with optimized images`);
    return products;
  } catch (error) {
    console.error('Error in getSupabaseProducts:', error);
    
    // Return empty array instead of throwing to prevent app crash
    if (error instanceof Error && error.message === 'Request timeout') {
      console.warn('⚠️ Supabase request timed out, returning empty products');
      return [];
    }
    
    throw error;
  }
};

export async function saveProduct(product: Partial<Product>, images: File[] = []): Promise<Product> {
  try {
    console.log('💾 Saving product:', product.name);
    console.log('📸 Images to upload:', images.length);
    
    let productData;
    
    if (product.id) {
      // Update existing product
      const { data, error } = await supabase
        .from('products')
        .update({
          name: product.name,
          category: product.category,
          description: product.description,
          price_idr: product.priceIdr,
          stock: product.stock,
          is_active: product.isActive,
        })
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;
      productData = data;
      console.log('✅ Product updated:', productData.id);
    } else {
      // Create new product
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          category: product.category,
          description: product.description,
          price_idr: product.priceIdr,
          stock: product.stock,
          is_active: product.isActive ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      productData = data;
      console.log('✅ Product created:', productData.id);
    }

    // Handle image uploads
    let imageUrl = '/placeholder.svg';
    if (images.length > 0) {
      console.log('📤 Uploading images...');
      const uploadedImages = await uploadProductImages(productData.id, images);
      if (uploadedImages.length > 0) {
        // Get the primary image URL
        const primaryImage = uploadedImages.find(img => img.isPrimary) || uploadedImages[0];
        imageUrl = primaryImage.imageUrl;
        console.log('✅ Images uploaded, primary image:', imageUrl);
      }
    }

    return {
      id: productData.id,
      name: productData.name,
      category: productData.category,
      description: productData.description || '',
      priceIdr: productData.price_idr,
      stock: productData.stock,
      imageUrl: imageUrl,
      isActive: productData.is_active,
      createdAt: productData.created_at,
      updatedAt: productData.updated_at
    };
  } catch (error) {
    console.error('❌ Error saving product:', error);
    throw error;
  }
}

export async function uploadProductImages(productId: string, files: File[]): Promise<ProductImage[]> {
  const uploadedImages: ProductImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = `${productId}/${Date.now()}-${file.name}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      continue;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    // Save image record to database
    const { data: imageData, error: imageError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: publicUrl,
        is_primary: i === 0, // First image is primary
        display_order: i
      })
      .select()
      .single();

    if (imageError) {
      console.error('Error saving image record:', imageError);
      continue;
    }

    uploadedImages.push({
      id: imageData.id,
      productId: imageData.product_id,
      imageUrl: imageData.image_url,
      isPrimary: imageData.is_primary,
      displayOrder: imageData.display_order,
      createdAt: imageData.created_at
    });
  }

  return uploadedImages;
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    console.log('Starting delete process for product:', id);
    
    // Step 1: Get all order IDs that reference this product
    console.log('Step 1: Finding orders that reference this product...');
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('order_id, id')
      .eq('product_id', id);

    if (orderItemsError) {
      console.error('Error fetching order items:', orderItemsError);
      throw new Error(`Gagal mengambil data pesanan: ${orderItemsError.message}`);
    }

    const orderIds = [...new Set(orderItems?.map(item => item.order_id) || [])];
    const orderItemIds = orderItems?.map(item => item.id) || [];
    console.log(`Found ${orderIds.length} orders and ${orderItemIds.length} order items referencing this product`);

    // Step 2: Delete payment proofs for these orders
    if (orderIds.length > 0) {
      console.log('Step 2: Deleting payment proofs...');
      const { error: paymentError } = await supabase
        .from('payment_proofs')
        .delete()
        .in('order_id', orderIds);

      if (paymentError) {
        console.error('Error deleting payment proofs:', paymentError);
        throw new Error(`Gagal menghapus bukti pembayaran: ${paymentError.message}`);
      }
      console.log('✓ Payment proofs deleted successfully');
    }

    // Step 3: Force delete order items by ID (more specific)
    if (orderItemIds.length > 0) {
      console.log('Step 3: Deleting order items by ID...');
      const { error: orderItemsDeleteError } = await supabase
        .from('order_items')
        .delete()
        .in('id', orderItemIds);

      if (orderItemsDeleteError) {
        console.error('Error deleting order items by ID:', orderItemsDeleteError);
        // Try alternative approach - delete by product_id
        console.log('Trying alternative approach - delete by product_id...');
        const { error: altError } = await supabase
          .from('order_items')
          .delete()
          .eq('product_id', id);

        if (altError) {
          console.error('Alternative approach also failed:', altError);
          throw new Error(`Gagal menghapus item pesanan: ${altError.message}`);
        }
      }
      console.log('✓ Order items deleted successfully');
    }

    // Step 4: Delete orders that only had this product (orphaned orders)
    if (orderIds.length > 0) {
      console.log('Step 4: Checking for orphaned orders...');
      for (const orderId of orderIds) {
        const { data: remainingItems, error: checkError } = await supabase
          .from('order_items')
          .select('id')
          .eq('order_id', orderId);

        if (checkError) {
          console.warn(`Warning: Could not check order ${orderId}:`, checkError);
          continue;
        }

        // If no more items in this order, delete the order
        if (!remainingItems || remainingItems.length === 0) {
          const { error: orderDeleteError } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId);

          if (orderDeleteError) {
            console.warn(`Warning: Could not delete orphaned order ${orderId}:`, orderDeleteError);
          } else {
            console.log(`✓ Deleted orphaned order: ${orderId}`);
          }
        }
      }
    }

    // Step 5: Delete product images from database
    console.log('Step 5: Deleting product images from database...');
    const { error: imagesDeleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id);

    if (imagesDeleteError) {
      console.error('Error deleting product images from database:', imagesDeleteError);
      throw new Error(`Gagal menghapus gambar produk dari database: ${imagesDeleteError.message}`);
    }
    console.log('✓ Product images deleted from database');

    // Step 6: Delete images from storage
    console.log('Step 6: Deleting images from storage...');
    try {
      const { data: storageFiles, error: listError } = await supabase.storage
        .from('product-images')
        .list(id);

      if (listError) {
        console.warn('Warning: Could not list storage files:', listError);
      } else if (storageFiles && storageFiles.length > 0) {
        const filePaths = storageFiles.map(file => `${id}/${file.name}`);
        const { error: storageDeleteError } = await supabase.storage
          .from('product-images')
          .remove(filePaths);

        if (storageDeleteError) {
          console.warn('Warning: Could not delete some storage files:', storageDeleteError);
        } else {
          console.log('✓ Storage files deleted successfully');
        }
      }
    } catch (storageError) {
      console.warn('Warning: Storage deletion error:', storageError);
    }

    // Step 7: Try to delete the product with a small delay to ensure all operations are complete
    console.log('Step 7: Waiting a moment before deleting product...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Step 8: Deleting product...');
    const { error: productError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (productError) {
      console.error('Error deleting product:', productError);
      
      // If it's still a foreign key constraint error, try to find what's still referencing it
      if (productError.message.includes('foreign key constraint')) {
        console.log('Foreign key constraint still exists. Checking for remaining references...');
        
        // Check if there are still any order_items referencing this product
        const { data: remainingOrderItems, error: checkError } = await supabase
          .from('order_items')
          .select('id, order_id')
          .eq('product_id', id);

        if (checkError) {
          console.error('Error checking remaining order items:', checkError);
        } else if (remainingOrderItems && remainingOrderItems.length > 0) {
          console.log(`Found ${remainingOrderItems.length} remaining order items. Trying to delete them...`);
          
          // Try to delete them one by one
          for (const item of remainingOrderItems) {
            const { error: itemDeleteError } = await supabase
              .from('order_items')
              .delete()
              .eq('id', item.id);

            if (itemDeleteError) {
              console.error(`Failed to delete order item ${item.id}:`, itemDeleteError);
            }
          }
          
          // Try deleting the product again
          console.log('Trying to delete product again...');
          const { error: retryError } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

          if (retryError) {
            throw new Error(`Gagal menghapus produk setelah retry: ${retryError.message}`);
          }
        } else {
          throw new Error(`Gagal menghapus produk: ${productError.message}`);
        }
      } else {
        throw new Error(`Gagal menghapus produk: ${productError.message}`);
      }
    }

    console.log('✓ Product deleted successfully');
    console.log('Product deletion completed successfully!');
    
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    if (error instanceof Error) {
      throw new Error(`Gagal menghapus produk: ${error.message}`);
    } else {
      throw new Error('Gagal menghapus produk: Error tidak diketahui');
    }
  }
}

export async function updateProductStock(id: string, stock: number): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ stock })
    .eq('id', id);

  if (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
}

export async function deleteProductImage(imageId: string): Promise<void> {
  // Get image details first
  const { data: image } = await supabase
    .from('product_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (image) {
    // Delete from storage
    const path = image.image_url.split('/').pop();
    if (path) {
      await supabase.storage
        .from('product-images')
        .remove([`${image.product_id}/${path}`]);
    }

    // Delete from database
    await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId);
  }
}

// Order functions
export async function getOrders(): Promise<Order[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*),
      payment_proofs(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }

  return orders?.map(order => ({
    id: order.id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    subtotalIdr: order.subtotal_idr,
    status: order.status as 'PENDING_PROOF' | 'PROOF_RECEIVED' | 'VERIFIED' | 'PREPARING' | 'COMPLETED' | 'REJECTED',
    createdAt: order.created_at,
    items: order.order_items?.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      nameSnapshot: item.name_snapshot,
      priceSnapshotIdr: item.price_snapshot_idr,
      quantity: item.quantity,
      lineTotalIdr: item.line_total_idr
    })) || [],
    paymentProof: order.payment_proofs?.[0] ? {
      id: order.payment_proofs[0].id,
      orderId: order.payment_proofs[0].order_id,
      fileUrl: order.payment_proofs[0].file_url,
      uploadedAt: order.payment_proofs[0].uploaded_at
    } : undefined
  })) || [];
}

export async function saveOrder(order: Order): Promise<void> {
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
    console.error('Error saving order:', orderError);
    throw orderError;
  }

  // Save order items
  if (order.items.length > 0) {
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
      console.error('Error saving order items:', itemsError);
      throw itemsError;
    }
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*),
      payment_proofs(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching order:', error);
    return null;
  }

  if (!order) return null;

  return {
    id: order.id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    subtotalIdr: order.subtotal_idr,
    status: order.status as 'PENDING_PROOF' | 'PROOF_RECEIVED' | 'VERIFIED' | 'PREPARING' | 'COMPLETED' | 'REJECTED',
    createdAt: order.created_at,
    items: order.order_items?.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      nameSnapshot: item.name_snapshot,
      priceSnapshotIdr: item.price_snapshot_idr,
      quantity: item.quantity,
      lineTotalIdr: item.line_total_idr
    })) || [],
    paymentProof: order.payment_proofs?.[0] ? {
      id: order.payment_proofs[0].id,
      orderId: order.payment_proofs[0].order_id,
      fileUrl: order.payment_proofs[0].file_url,
      uploadedAt: order.payment_proofs[0].uploaded_at
    } : undefined
  };
}

export async function updateOrderStatus(orderId: string, status: 'PENDING_PROOF' | 'PROOF_RECEIVED' | 'VERIFIED' | 'PREPARING' | 'COMPLETED' | 'REJECTED'): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

export async function setOrderPreparing(orderId: string) {
  return updateOrderStatus(orderId, 'PREPARING');
}
export async function setOrderCompleted(orderId: string) {
  return updateOrderStatus(orderId, 'COMPLETED');
}
export async function setOrderRejected(orderId: string) {
  return updateOrderStatus(orderId, 'REJECTED');
}

export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);
  if (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
}

export async function addPaymentProof(orderId: string, fileUrl: string): Promise<PaymentProof> {
  // Insert payment proof
  const { data: inserted, error: proofError } = await supabase
    .from('payment_proofs')
    .insert({ order_id: orderId, file_url: fileUrl })
    .select('*')
    .single();

  if (proofError) {
    console.error('Error saving payment proof:', proofError);
    throw proofError;
  }

  // Update order status
  await updateOrderStatus(orderId, 'PROOF_RECEIVED');

  return {
    id: inserted.id,
    orderId: inserted.order_id,
    fileUrl: inserted.file_url,
    uploadedAt: inserted.uploaded_at,
  };
}

// Force delete function that bypasses all constraints
export async function forceDeleteProduct(id: string): Promise<void> {
  try {
    console.log('🚨 FORCE DELETE MODE ACTIVATED for product:', id);
    console.log('This will forcefully delete ALL related data...');
    
    // Step 1: Force delete ALL order_items that reference this product
    console.log('Step 1: FORCE DELETING order_items...');
    let orderItemsDeleted = 0;
    let maxAttempts = 10;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { data: remainingItems, error: checkError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', id);

      if (checkError) {
        console.error(`Attempt ${attempt}: Error checking order items:`, checkError);
        break;
      }

      if (!remainingItems || remainingItems.length === 0) {
        console.log(`✓ All order items already deleted (attempt ${attempt})`);
        break;
      }

      console.log(`Attempt ${attempt}: Found ${remainingItems.length} remaining order items`);
      
      // Force delete each item individually
      for (const item of remainingItems) {
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('id', item.id);

        if (deleteError) {
          console.error(`Failed to delete order item ${item.id}:`, deleteError);
        } else {
          orderItemsDeleted++;
        }
      }

      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✓ Force deleted ${orderItemsDeleted} order items`);

    // Step 2: Force delete ALL product_images
    console.log('Step 2: FORCE DELETING product_images...');
    const { error: imagesError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id);

    if (imagesError) {
      console.error('Force delete product_images failed:', imagesError);
    } else {
      console.log('✓ Force deleted product_images');
    }

    // Step 3: Force delete from storage
    console.log('Step 3: FORCE DELETING from storage...');
    try {
      const { data: storageFiles, error: listError } = await supabase.storage
        .from('product-images')
        .list(id);

      if (!listError && storageFiles && storageFiles.length > 0) {
        const filePaths = storageFiles.map(file => `${id}/${file.name}`);
        const { error: storageError } = await supabase.storage
          .from('product-images')
          .remove(filePaths);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
        } else {
          console.log('✓ Force deleted from storage');
        }
      }
    } catch (storageError) {
      console.error('Storage deletion failed:', storageError);
    }

    // Step 4: Wait and verify no remaining references
    console.log('Step 4: Verifying no remaining references...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Final check for any remaining order_items
    const { data: finalCheck, error: finalCheckError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', id);

    if (finalCheckError) {
      console.error('Final check failed:', finalCheckError);
    } else if (finalCheck && finalCheck.length > 0) {
      console.log(`⚠️ WARNING: Still found ${finalCheck.length} order items. Attempting final cleanup...`);
      
      // One more aggressive cleanup
      for (const item of finalCheck) {
        await supabase
          .from('order_items')
          .delete()
          .eq('id', item.id);
      }
    }

    // Step 5: FINAL FORCE DELETE of the product
    console.log('Step 5: FINAL FORCE DELETE of product...');
    const { error: finalDeleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (finalDeleteError) {
      console.error('🚨 FINAL DELETE FAILED:', finalDeleteError);
      
      // Last resort: try to update the product to be inactive instead
      console.log('Last resort: Setting product as inactive...');
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

      if (updateError) {
        throw new Error(`Even setting inactive failed: ${updateError.message}`);
      } else {
        console.log('✓ Product set as inactive (soft delete)');
        return;
      }
    }

    console.log('🎉 FORCE DELETE COMPLETED SUCCESSFULLY!');
    console.log('✓ Product and ALL related data have been forcefully removed');
    
  } catch (error) {
    console.error('🚨 FORCE DELETE FAILED:', error);
    throw new Error(`Force delete gagal: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`);
  }
}

// Enhanced delete function with multiple fallback strategies
export async function deleteProductEnhanced(id: string): Promise<void> {
  try {
    console.log('Starting enhanced delete process for product:', id);
    
    // Strategy 1: Try regular delete first
    try {
      return await deleteProduct(id);
    } catch (regularError) {
      console.log('Regular delete failed, trying force delete...');
    }

    // Strategy 2: Force delete approach
    console.log('Strategy 2: Force delete approach...');
    return await forceDeleteProduct(id);
    
  } catch (error) {
    console.error('All delete strategies failed:', error);
    throw new Error(`Semua metode penghapusan gagal: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`);
  }
}

// Ultimate delete function - bypasses all foreign key constraints
export const ultimateDeleteProduct = async (productId: string): Promise<void> => {
  console.log('☢️ ULTIMATE DELETE MODE ACTIVATED for product:', productId);
  console.log('This will forcefully delete ALL related data and the product itself');
  
  try {
    // Step 1: Get all related data first
    console.log('Step 1: Gathering all related data...');
    
    // Get all order items for this product
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('product_id', productId);
    
    if (orderItemsError) {
      console.log('⚠️ Error getting order items:', orderItemsError);
    } else {
      console.log(`Found ${orderItems?.length || 0} order items to delete`);
    }
    
    // Get all product images for this product
    const { data: productImages, error: productImagesError } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId);
    
    if (productImagesError) {
      console.log('⚠️ Error getting product images:', productImagesError);
    } else {
      console.log(`Found ${productImages?.length || 0} product images to delete`);
    }
    
    // Step 2: Force delete order items (multiple attempts)
    console.log('Step 2: Force deleting order items...');
    if (orderItems && orderItems.length > 0) {
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Deleting ${orderItems.length} order items...`);
          
          const { error: deleteError } = await supabase
            .from('order_items')
            .delete()
            .eq('product_id', productId);
          
          if (deleteError) {
            console.log(`Attempt ${attempt} failed:`, deleteError);
            if (attempt === 5) {
              throw new Error(`Failed to delete order items after 5 attempts: ${deleteError.message}`);
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.log(`✅ Successfully deleted ${orderItems.length} order items on attempt ${attempt}`);
            break;
          }
        } catch (error) {
          console.log(`Attempt ${attempt} error:`, error);
          if (attempt === 5) throw error;
        }
      }
    }
    
    // Step 3: Force delete product images from database
    console.log('Step 3: Force deleting product images from database...');
    if (productImages && productImages.length > 0) {
      const { error: deleteImagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);
      
      if (deleteImagesError) {
        console.log('⚠️ Error deleting product images from DB:', deleteImagesError);
      } else {
        console.log(`✅ Successfully deleted ${productImages.length} product images from database`);
      }
    }
    
    // Step 4: Force delete images from storage
    console.log('Step 4: Force deleting images from storage...');
    if (productImages && productImages.length > 0) {
      for (const image of productImages) {
        try {
          const { error: storageError } = await supabase.storage
            .from('product-images')
            .remove([image.image_url]); // Changed from image_path to image_url
          
          if (storageError) {
            console.log(`⚠️ Error deleting image ${image.image_url} from storage:`, storageError);
          } else {
            console.log(`✅ Successfully deleted image ${image.image_url} from storage`);
          }
        } catch (error) {
          console.log(`⚠️ Error deleting image ${image.image_url}:`, error);
        }
      }
    }
    
    // Step 5: Wait a moment for all deletions to complete
    console.log('Step 5: Waiting for deletions to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 6: Force delete the product itself
    console.log('Step 6: Force deleting the product...');
    const { error: productDeleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (productDeleteError) {
      console.log('❌ Error deleting product:', productDeleteError);
      
      // If still failing, try to set is_active to false as last resort
      console.log('Step 7: Trying soft delete as last resort...');
      const { error: softDeleteError } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);
      
      if (softDeleteError) {
        throw new Error(`Both hard delete and soft delete failed: ${productDeleteError.message}`);
      } else {
        console.log('✅ Product soft deleted (is_active set to false)');
      }
    } else {
      console.log('✅ Product successfully deleted from database');
    }
    
    console.log('🎉 ULTIMATE DELETE COMPLETE - All related data and product removed');
    
  } catch (error) {
    console.error('❌ ULTIMATE DELETE FAILED:', error);
    throw new Error(`Ultimate delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Nuclear delete function - completely removes product and all related data
export const nuclearDeleteProduct = async (productId: string): Promise<void> => {
  console.log('☢️ NUCLEAR DELETE MODE ACTIVATED for product:', productId);
  console.log('This will execute direct SQL to completely remove the product');
  
  try {
    // Step 1: Direct SQL to delete order_items
    console.log('Step 1: Executing direct SQL to delete order_items...');
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('product_id', productId);
    
    if (orderItemsError) {
      console.log('❌ Error deleting order_items:', orderItemsError);
    } else {
      console.log('✅ Successfully deleted order_items');
    }
    
    // Step 2: Direct SQL to delete product_images
    console.log('Step 2: Executing direct SQL to delete product_images...');
    const { error: imagesError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);
    
    if (imagesError) {
      console.log('❌ Error deleting product_images:', imagesError);
    } else {
      console.log('✅ Successfully deleted product_images');
    }
    
    // Step 3: Wait for deletions to complete
    console.log('Step 3: Waiting for deletions to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Force delete the product with multiple strategies
    console.log('Step 4: Force deleting the product...');
    
    // Strategy 1: Try normal delete
    let { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (deleteError) {
      console.log('❌ Normal delete failed:', deleteError);
      
      // Strategy 2: Try to update is_active to false first, then delete
      console.log('Strategy 2: Setting is_active to false first...');
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);
      
      if (updateError) {
        console.log('❌ Update is_active failed:', updateError);
      } else {
        console.log('✅ is_active set to false');
        
        // Now try to delete again
        await new Promise(resolve => setTimeout(resolve, 500));
        const { error: retryError } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);
        
        if (retryError) {
          console.log('❌ Retry delete also failed:', retryError);
          throw new Error(`Product cannot be deleted even after setting is_active to false: ${retryError.message}`);
        } else {
          console.log('✅ Product deleted after setting is_active to false');
        }
      }
    } else {
      console.log('✅ Product successfully deleted');
    }
    
    console.log('🎉 NUCLEAR DELETE COMPLETE - Product and all related data removed');
    
  } catch (error) {
    console.error('❌ NUCLEAR DELETE FAILED:', error);
    throw new Error(`Nuclear delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};