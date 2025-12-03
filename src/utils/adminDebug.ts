import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';

/**
 * Debug utilities for admin functionality
 */

export const debugSupabaseConnection = async (): Promise<void> => {
  console.log('🔍 Testing Supabase connection for admin...');
  
  try {
    // Test basic connection
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      throw error;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('📊 Sample product data:', products?.[0]);
    
    // Test insert permission
    console.log('🔍 Testing insert permissions...');
    const testProduct = {
      name: 'TEST_PRODUCT_' + Date.now(),
      category: 'Makanan',
      description: 'Test product for debugging',
      price_idr: 1000,
      stock: 1,
      is_active: true
    };
    
    const { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert(testProduct)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
      throw insertError;
    }
    
    console.log('✅ Insert test successful:', insertedProduct);
    
    // Clean up test product
    await supabase
      .from('products')
      .delete()
      .eq('id', insertedProduct.id);
    
    console.log('✅ Test product cleaned up');
    
  } catch (error) {
    console.error('❌ Admin debug failed:', error);
    throw error;
  }
};

export const forceRefreshProducts = async (): Promise<Product[]> => {
  console.log('🔄 Force refreshing products with detailed logging...');
  
  try {
    const { data: products, error } = await supabase
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
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching products:', error);
      throw error;
    }
    
    console.log(`✅ Fetched ${products?.length || 0} products`);
    
    // Transform data
    const transformedProducts: Product[] = (products || []).map((item: any) => {
      const primaryImage = item.product_images?.find((img: any) => img.is_primary) || item.product_images?.[0];
      
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        priceIdr: item.price_idr,
        stock: item.stock,
        category: item.category,
        imageUrl: primaryImage?.image_url || '/placeholder.svg',
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
    
    console.log('📋 Transformed products:', transformedProducts.map(p => ({ id: p.id, name: p.name, stock: p.stock })));
    
    return transformedProducts;
    
  } catch (error) {
    console.error('❌ Force refresh failed:', error);
    throw error;
  }
};

export const debugProductSave = async (productData: any, images: File[] = []): Promise<void> => {
  console.log('🔍 Debugging product save...');
  console.log('📝 Product data:', productData);
  console.log('📸 Images:', images.length);
  
  try {
    // Validate required fields
    if (!productData.name || productData.name.trim() === '') {
      throw new Error('Nama produk harus diisi');
    }
    
    if (!productData.priceIdr || productData.priceIdr <= 0) {
      throw new Error('Harga harus lebih dari 0');
    }
    
    if (productData.stock < 0) {
      throw new Error('Stok tidak boleh negatif');
    }
    
    if (productData.id) {
      console.log('🔄 Updating existing product...');
      
      const { data: updatedProduct, error } = await supabase
        .from('products')
        .update({
          name: productData.name.trim(),
          category: productData.category || 'Makanan',
          description: productData.description?.trim() || '',
          price_idr: parseInt(productData.priceIdr),
          stock: parseInt(productData.stock) || 0,
          is_active: productData.isActive !== false,
        })
        .eq('id', productData.id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Update failed:', error);
        throw new Error(`Update gagal: ${error.message}`);
      }
      
      console.log('✅ Product updated:', updatedProduct);
      
    } else {
      console.log('➕ Creating new product...');
      
      // Prepare data for insert
      const insertData = {
        name: productData.name.trim(),
        category: productData.category || 'Makanan',
        description: productData.description?.trim() || '',
        price_idr: parseInt(productData.priceIdr),
        stock: parseInt(productData.stock) || 0,
        is_active: true
      };
      
      console.log('📋 Insert data:', insertData);
      
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Insert failed:', error);
        throw new Error(`Insert gagal: ${error.message}`);
      }
      
      console.log('✅ Product created:', newProduct);
      
      // Handle images if any
      if (images.length > 0) {
        console.log('📸 Processing images...');
        
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const fileName = `${newProduct.id}/${Date.now()}-${file.name}`;
          
          try {
            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, file);
            
            if (uploadError) {
              console.error('❌ Image upload failed:', uploadError);
              continue;
            }
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);
            
            // Save image record
            const { error: imageError } = await supabase
              .from('product_images')
              .insert({
                product_id: newProduct.id,
                image_url: publicUrl,
                is_primary: i === 0,
                display_order: i
              });
            
            if (imageError) {
              console.error('❌ Image record save failed:', imageError);
            } else {
              console.log(`✅ Image ${i + 1} saved: ${publicUrl}`);
            }
          } catch (imageError) {
            console.error(`❌ Error processing image ${i + 1}:`, imageError);
          }
        }
      } else {
        // Add placeholder image if no images provided
        console.log('📸 Adding placeholder image...');
        try {
          const { error: placeholderError } = await supabase
            .from('product_images')
            .insert({
              product_id: newProduct.id,
              image_url: '/placeholder.svg',
              is_primary: true,
              display_order: 0
            });
          
          if (placeholderError) {
            console.warn('⚠️ Could not add placeholder image:', placeholderError);
          } else {
            console.log('✅ Placeholder image added');
          }
        } catch (placeholderError) {
          console.warn('⚠️ Placeholder image error:', placeholderError);
        }
      }
    }
    
    // Verify the save
    console.log('🔍 Verifying save...');
    const savedProducts = await forceRefreshProducts();
    console.log(`✅ Verification complete: ${savedProducts.length} products found`);
    
  } catch (error) {
    console.error('❌ Debug product save failed:', error);
    throw error;
  }
};

export const debugStockUpdate = async (productId: string, newStock: number): Promise<void> => {
  console.log(`🔍 Debugging stock update for product ${productId} to ${newStock}...`);
  
  try {
    // Get current product
    const { data: currentProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (fetchError) {
      console.error('❌ Failed to fetch current product:', fetchError);
      throw fetchError;
    }
    
    console.log('📋 Current product:', currentProduct);
    
    // Update stock
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Stock update failed:', updateError);
      throw updateError;
    }
    
    console.log('✅ Stock updated:', updatedProduct);
    
    // Verify the update
    const { data: verifyProduct, error: verifyError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', productId)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      throw verifyError;
    }
    
    console.log('🔍 Verification result:', verifyProduct);
    
    if (verifyProduct.stock !== newStock) {
      throw new Error(`Stock update verification failed: expected ${newStock}, got ${verifyProduct.stock}`);
    }
    
    console.log('✅ Stock update verified successfully');
    
  } catch (error) {
    console.error('❌ Debug stock update failed:', error);
    throw error;
  }
};

export const initializeAdminDebug = (): void => {
  console.log('🔧 Initializing admin debug utilities...');
  
  // Add global debug functions for admin
  if (typeof window !== 'undefined') {
    (window as any).adminDebug = {
      testConnection: debugSupabaseConnection,
      refreshProducts: forceRefreshProducts,
      testProductSave: debugProductSave,
      testStockUpdate: debugStockUpdate
    };
    
    console.log('✅ Admin debug utilities available at window.adminDebug');
    console.log('🛠️ Available functions:');
    console.log('  - testConnection(): Test Supabase connection');
    console.log('  - refreshProducts(): Force refresh products');
    console.log('  - testProductSave(data, images): Test product save');
    console.log('  - testStockUpdate(id, stock): Test stock update');
  }
};
