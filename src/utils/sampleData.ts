import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Sample products for testing
export const sampleProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'images'>[] = [
  {
    name: 'Rendang Daging Sapi',
    category: 'Makanan',
    description: 'Rendang daging sapi asli Padang dengan rempah-rempah pilihan. Dimasak dengan santan dan bumbu tradisional selama berjam-jam hingga bumbu meresap sempurna.',
    priceIdr: 85000,
    stock: 15,
    imageUrl: '/placeholder.svg',
    isActive: true
  },
  {
    name: 'Ayam Pop Padang',
    category: 'Makanan',
    description: 'Ayam pop khas Padang yang dimasak dengan teknik khusus hingga daging empuk dan bumbu meresap. Disajikan dengan sambal hijau yang pedas.',
    priceIdr: 65000,
    stock: 20,
    imageUrl: '/placeholder.svg',
    isActive: true
  },
  {
    name: 'Gulai Ikan Kakap',
    category: 'Makanan',
    description: 'Gulai ikan kakap dengan kuah santan yang gurih dan segar. Ikan kakap segar dimasak dengan bumbu gulai tradisional Minang.',
    priceIdr: 75000,
    stock: 12,
    imageUrl: '/placeholder.svg',
    isActive: true
  },
  {
    name: 'Dendeng Balado',
    category: 'Makanan',
    description: 'Dendeng daging sapi yang digoreng kering dengan bumbu balado yang pedas dan gurih. Cocok sebagai lauk atau camilan.',
    priceIdr: 95000,
    stock: 10,
    imageUrl: '/placeholder.svg',
    isActive: true
  },
  {
    name: 'Keripik Singkong Balado',
    category: 'Snack',
    description: 'Keripik singkong renyah dengan bumbu balado yang pedas manis. Dibuat dari singkong pilihan dan bumbu asli Minang.',
    priceIdr: 25000,
    stock: 30,
    imageUrl: '/placeholder.svg',
    isActive: true
  },
  {
    name: 'Keripik Sanjai',
    category: 'Snack',
    description: 'Keripik sanjai khas Bukittinggi dengan rasa gurih dan renyah. Terbuat dari ubi kayu pilihan dengan bumbu rahasia.',
    priceIdr: 20000,
    stock: 25,
    imageUrl: '/placeholder.svg',
    isActive: true
  },
  {
    name: 'Sambal Lado Mudo',
    category: 'Makanan',
    description: 'Sambal lado mudo dengan cabe hijau segar dan bumbu tradisional. Cocok sebagai pelengkap berbagai masakan.',
    priceIdr: 15000,
    stock: 40,
    imageUrl: '/placeholder.svg',
    isActive: true
  },
  {
    name: 'Kue Bolu Kemojo',
    category: 'Snack',
    description: 'Kue bolu kemojo khas Padang dengan tekstur lembut dan rasa manis yang pas. Dibuat dengan resep turun temurun.',
    priceIdr: 35000,
    stock: 18,
    imageUrl: '/placeholder.svg',
    isActive: true
  }
];

export const insertSampleProducts = async (): Promise<void> => {
  try {
    console.log('🌱 Inserting sample products...');
    
    // Check if products already exist
    const { data: existingProducts, error: checkError } = await supabase
      .from('products')
      .select('id, name')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing products:', checkError);
      throw checkError;
    }
    
    if (existingProducts && existingProducts.length > 0) {
      console.log('✅ Sample products already exist, skipping insertion');
      return;
    }
    
    // Insert sample products
    const productsToInsert = sampleProducts.map(product => ({
      name: product.name,
      category: product.category,
      description: product.description,
      price_idr: product.priceIdr,
      stock: product.stock,
      is_active: product.isActive
    }));
    
    const { data: insertedProducts, error: insertError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select('id, name');
    
    if (insertError) {
      console.error('Error inserting sample products:', insertError);
      throw insertError;
    }
    
    console.log(`✅ Successfully inserted ${insertedProducts?.length || 0} sample products`);
    
    // Add sample images for each product
    if (insertedProducts) {
      for (const product of insertedProducts) {
        const { error: imageError } = await supabase
          .from('product_images')
          .insert({
            product_id: product.id,
            image_url: '/placeholder.svg',
            is_primary: true,
            display_order: 0
          });
        
        if (imageError) {
          console.warn(`Warning: Could not add image for product ${product.name}:`, imageError);
        }
      }
    }
    
    console.log('🎉 Sample data setup complete!');
    
  } catch (error) {
    console.error('❌ Failed to insert sample products:', error);
    throw error;
  }
};

export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔌 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    console.log(`📊 Found ${data?.length || 0} products in database`);
    return true;
    
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return false;
  }
};



