import { Product } from '@/types';

/**
 * Fallback storage for when Supabase is not available
 * Uses localStorage for temporary storage
 */

const FALLBACK_KEY = 'jastiprijo_fallback_products';

export const getFallbackProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(FALLBACK_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading fallback products:', error);
  }
  return [];
};

export const saveFallbackProduct = (product: Product): void => {
  try {
    const products = getFallbackProducts();
    const existingIndex = products.findIndex(p => p.id === product.id);

    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.push(product);
    }

    localStorage.setItem(FALLBACK_KEY, JSON.stringify(products));
    console.log('✅ Product saved to fallback storage');
  } catch (error) {
    console.error('Error saving to fallback storage:', error);
  }
};

export const deleteFallbackProduct = (id: string): void => {
  try {
    const products = getFallbackProducts();
    const filtered = products.filter(p => p.id !== id);
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(filtered));
    console.log('✅ Product deleted from fallback storage');
  } catch (error) {
    console.error('Error deleting from fallback storage:', error);
  }
};

export const updateFallbackStock = (id: string, newStock: number): void => {
  try {
    const products = getFallbackProducts();
    const product = products.find(p => p.id === id);
    if (product) {
      product.stock = newStock;
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(products));
      console.log('✅ Stock updated in fallback storage');
    }
  } catch (error) {
    console.error('Error updating stock in fallback storage:', error);
  }
};

/**
 * Initialize fallback storage with sample products if empty
 * This allows the app to work in offline/demo mode
 */
export const initializeSampleProducts = (): void => {
  const existing = getFallbackProducts();

  // Only initialize if storage is empty
  if (existing.length > 0) {
    console.log('📦 Fallback storage already has products, skipping initialization');
    return;
  }

  console.log('🌱 Initializing fallback storage with sample products...');

  const sampleProducts: Product[] = [
    {
      id: 'sample-1',
      name: 'Cakalang Fufu',
      category: 'Makanan',
      description: 'Ikan cakalang asap khas Manado yang gurih dan lezat',
      priceIdr: 85000,
      stock: 10,
      imageUrl: '/placeholder.svg',
      images: [{
        id: 'img-1',
        productId: 'sample-1',
        imageUrl: '/placeholder.svg',
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date().toISOString()
      }],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'sample-2',
      name: 'Rica-Rica',
      category: 'Makanan',
      description: 'Sambal rica-rica pedas khas Manado',
      priceIdr: 45000,
      stock: 15,
      imageUrl: '/placeholder.svg',
      images: [{
        id: 'img-2',
        productId: 'sample-2',
        imageUrl: '/placeholder.svg',
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date().toISOString()
      }],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'sample-3',
      name: 'Kue Kacang Manado',
      category: 'Snack',
      description: 'Kue kacang renyah khas Manado',
      priceIdr: 35000,
      stock: 20,
      imageUrl: '/placeholder.svg',
      images: [{
        id: 'img-3',
        productId: 'sample-3',
        imageUrl: '/placeholder.svg',
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date().toISOString()
      }],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'sample-4',
      name: 'Sambal Roa',
      category: 'Makanan',
      description: 'Sambal ikan roa asap pedas khas Manado',
      priceIdr: 55000,
      stock: 12,
      imageUrl: '/placeholder.svg',
      images: [{
        id: 'img-4',
        productId: 'sample-4',
        imageUrl: '/placeholder.svg',
        isPrimary: true,
        displayOrder: 0,
        createdAt: new Date().toISOString()
      }],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  localStorage.setItem(FALLBACK_KEY, JSON.stringify(sampleProducts));
  console.log(`✅ Initialized ${sampleProducts.length} sample products in fallback storage`);
};



