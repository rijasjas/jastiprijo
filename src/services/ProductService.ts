/**
 * Product Service - Clean Architecture Implementation
 * Handles all product-related operations with proper error handling
 */

import { BaseService, ServiceResponse } from './BaseService';
import { Product, ProductImage } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getFallbackProducts, saveFallbackProduct, updateFallbackStock, deleteFallbackProduct } from '@/utils/fallbackStorage';
import { eventBus } from '@/utils/eventBus';

export interface ProductFilters {
  category?: string;
  isActive?: boolean;
  search?: string;
}

export interface CreateProductData {
  name: string;
  category: string;
  description?: string;
  priceIdr: number;
  stock: number;
  isActive?: boolean;
  images?: File[];
}

export interface UpdateProductData {
  id: string;
  name?: string;
  category?: string;
  description?: string;
  priceIdr?: number;
  stock?: number;
  isActive?: boolean;
  images?: File[];
}

export class ProductService extends BaseService {
  constructor() {
    super({
      retries: 3,
      timeout: 10000,
      fallback: () => Promise.resolve(getFallbackProducts())
    });
  }

  /**
   * Get all products with optional filtering
   */
  async getProducts(filters: ProductFilters = {}): Promise<ServiceResponse<Product[]>> {
    return this.execute(
      async () => {
        console.log('🔄 Fetching products from Supabase...');

        let query = supabase
          .from('products')
          .select(`
            *,
            product_images (
              id,
              product_id,
              image_url,
              is_primary,
              display_order,
              created_at
            )
          `)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.category) {
          query = query.eq('category', filters.category);
        }

        // IMPORTANT: Only filter by isActive if explicitly requested
        // By default, show ALL products (including inactive)
        if (filters.isActive !== undefined) {
          query = query.eq('is_active', filters.isActive);
        }

        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }

        if (!data) {
          throw new Error('No data returned from Supabase');
        }

        // Transform data to match our Product interface
        const products: Product[] = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          description: item.description || '',
          priceIdr: item.price_idr,
          price_idr: item.price_idr,
          stock: item.stock,
          imageUrl: this.getPrimaryImageUrl(item.product_images),
          images: this.transformImages(item.product_images),
          isActive: item.is_active,
          is_active: item.is_active,
          createdAt: item.created_at,
          created_at: item.created_at,
          updatedAt: item.updated_at || item.created_at,
          updated_at: item.updated_at || item.created_at
        }));

        console.log(`✅ Fetched ${products.length} products from Supabase`);
        return products;
      },
      async () => {
        console.log('🔄 Falling back to local storage...');

        // Initialize sample products if storage is empty
        const { initializeSampleProducts } = await import('@/utils/fallbackStorage');
        initializeSampleProducts();

        const fallbackProducts = getFallbackProducts();
        console.log(`✅ Fetched ${fallbackProducts.length} products from fallback storage`);

        // Show user-friendly message if using fallback
        if (fallbackProducts.length > 0) {
          console.warn('⚠️ Using offline mode with sample products. Supabase connection failed.');
        }

        return fallbackProducts;
      },
      'Get Products'
    );
  }

  /**
   * Get single product by ID
   */
  async getProduct(id: string): Promise<ServiceResponse<Product>> {
    return this.execute(
      async () => {
        console.log(`🔄 Fetching product ${id} from Supabase...`);

        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_images (
              id,
              product_id,
              image_url,
              is_primary,
              display_order,
              created_at
            )
          `)
          .eq('id', id)
          .single();

        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }

        if (!data) {
          throw new Error('Product not found');
        }

        const product: Product = {
          id: data.id,
          name: data.name,
          category: data.category,
          description: data.description || '',
          priceIdr: data.price_idr,
          price_idr: data.price_idr,
          stock: data.stock,
          imageUrl: this.getPrimaryImageUrl(data.product_images),
          images: this.transformImages(data.product_images),
          isActive: data.is_active,
          is_active: data.is_active,
          createdAt: data.created_at,
          created_at: data.created_at,
          updatedAt: data.updated_at || data.created_at,
          updated_at: data.updated_at || data.created_at
        };

        console.log(`✅ Fetched product ${id} from Supabase`);
        return product;
      },
      async () => {
        console.log(`🔄 Falling back to local storage for product ${id}...`);
        const fallbackProducts = getFallbackProducts();
        const product = fallbackProducts.find(p => p.id === id);

        if (!product) {
          throw new Error('Product not found in fallback storage');
        }

        console.log(`✅ Fetched product ${id} from fallback storage`);
        return product;
      },
      `Get Product ${id}`
    );
  }

  /**
   * Create new product
   */
  async createProduct(productData: CreateProductData): Promise<ServiceResponse<Product>> {
    // Validate required fields
    const missing = this.validateRequired(productData, ['name', 'priceIdr']);
    if (missing.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
        message: 'Validation failed'
      };
    }

    return this.execute(
      async () => {
        console.log('🔄 Creating product in Supabase...');

        // Sanitize data
        const sanitizedData = this.sanitizeData({
          name: productData.name,
          category: productData.category || 'Makanan',
          description: productData.description || '',
          price_idr: parseInt(productData.priceIdr.toString()),
          stock: parseInt(productData.stock.toString()) || 0,
          is_active: productData.isActive !== false
        });

        // Create product
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert(sanitizedData)
          .select()
          .single();

        if (productError) {
          throw new Error(`Failed to create product: ${productError.message}`);
        }

        // Handle images if provided
        if (productData.images && productData.images.length > 0) {
          await this.uploadProductImages(newProduct.id, productData.images);
        } else {
          // Add placeholder image
          await this.addPlaceholderImage(newProduct.id);
        }

        // Fetch complete product with images
        const completeProduct = await this.getProduct(newProduct.id);
        if (!completeProduct.success || !completeProduct.data) {
          throw new Error('Failed to fetch created product');
        }

        console.log(`✅ Created product ${newProduct.id} in Supabase`);
        return completeProduct.data;
      },
      async () => {
        console.log('🔄 Creating product in fallback storage...');

        const newProduct: Product = {
          id: `fallback-${Date.now()}`,
          name: productData.name,
          category: productData.category || 'Makanan',
          description: productData.description || '',
          priceIdr: productData.priceIdr,
          stock: productData.stock || 0,
          imageUrl: '/placeholder.svg',
          isActive: productData.isActive !== false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          images: [{
            id: `img-${Date.now()}`,
            productId: `fallback-${Date.now()}`,
            imageUrl: '/placeholder.svg',
            isPrimary: true,
            displayOrder: 0,
            createdAt: new Date().toISOString()
          }]
        };

        saveFallbackProduct(newProduct);

        // Emit event for real-time sync
        eventBus.emitProductAdded(newProduct);

        console.log(`✅ Created product ${newProduct.id} in fallback storage`);
        return newProduct;
      },
      'Create Product'
    );
  }

  /**
   * Update existing product
   */
  async updateProduct(updateData: UpdateProductData): Promise<ServiceResponse<Product>> {
    if (!updateData.id) {
      return {
        success: false,
        error: 'Product ID is required',
        message: 'Validation failed'
      };
    }

    return this.execute(
      async () => {
        console.log(`🔄 Updating product ${updateData.id} in Supabase...`);

        const sanitizedData = this.sanitizeData({
          name: updateData.name,
          category: updateData.category,
          description: updateData.description,
          price_idr: updateData.priceIdr ? parseInt(updateData.priceIdr.toString()) : undefined,
          stock: updateData.stock ? parseInt(updateData.stock.toString()) : undefined,
          is_active: updateData.isActive,
          updated_at: new Date().toISOString()
        });

        const { data: updatedProduct, error } = await supabase
          .from('products')
          .update(sanitizedData)
          .eq('id', updateData.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update product: ${error.message}`);
        }

        // Handle new images if provided
        if (updateData.images && updateData.images.length > 0) {
          await this.uploadProductImages(updateData.id, updateData.images);
        }

        // Fetch complete product
        const completeProduct = await this.getProduct(updateData.id);
        if (!completeProduct.success || !completeProduct.data) {
          throw new Error('Failed to fetch updated product');
        }

        console.log(`✅ Updated product ${updateData.id} in Supabase`);
        return completeProduct.data;
      },
      async () => {
        console.log(`🔄 Updating product ${updateData.id} in fallback storage...`);

        const fallbackProducts = getFallbackProducts();
        const productIndex = fallbackProducts.findIndex(p => p.id === updateData.id);

        if (productIndex === -1) {
          throw new Error('Product not found in fallback storage');
        }

        const updatedProduct: Product = {
          ...fallbackProducts[productIndex],
          name: updateData.name ?? fallbackProducts[productIndex].name,
          category: updateData.category ?? fallbackProducts[productIndex].category,
          description: updateData.description ?? fallbackProducts[productIndex].description,
          priceIdr: updateData.priceIdr ?? fallbackProducts[productIndex].priceIdr,
          stock: updateData.stock ?? fallbackProducts[productIndex].stock,
          isActive: updateData.isActive ?? fallbackProducts[productIndex].isActive,
          updatedAt: new Date().toISOString()
        };

        fallbackProducts[productIndex] = updatedProduct;
        localStorage.setItem('jastiprijo_fallback_products', JSON.stringify(fallbackProducts));

        // Emit event for real-time sync
        eventBus.emitProductUpdated(updatedProduct);

        console.log(`✅ Updated product ${updateData.id} in fallback storage`);
        return updatedProduct;
      },
      `Update Product ${updateData.id}`
    );
  }

  /**
   * Update product stock
   */
  async updateStock(productId: string, newStock: number): Promise<ServiceResponse<Product>> {
    if (newStock < 0) {
      return {
        success: false,
        error: 'Stock cannot be negative',
        message: 'Validation failed'
      };
    }

    return this.execute(
      async () => {
        console.log(`🔄 Updating stock for product ${productId} in Supabase...`);

        const { data, error } = await supabase
          .from('products')
          .update({
            stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', productId)
          .select(`
            *,
            product_images (
              id,
              product_id,
              image_url,
              is_primary,
              display_order,
              created_at
            )
          `)
          .single();

        if (error) {
          throw new Error(`Failed to update stock: ${error.message}`);
        }

        const product: Product = {
          id: data.id,
          name: data.name,
          category: data.category,
          description: data.description || '',
          priceIdr: data.price_idr,
          price_idr: data.price_idr,
          stock: data.stock,
          imageUrl: this.getPrimaryImageUrl(data.product_images),
          images: this.transformImages(data.product_images),
          isActive: data.is_active,
          is_active: data.is_active,
          createdAt: data.created_at,
          created_at: data.created_at,
          updatedAt: data.updated_at || data.created_at,
          updated_at: data.updated_at || data.created_at
        };

        console.log(`✅ Updated stock for product ${productId} in Supabase`);
        return product;
      },
      async () => {
        console.log(`🔄 Updating stock for product ${productId} in fallback storage...`);

        updateFallbackStock(productId, newStock);

        // Emit event for real-time sync
        eventBus.emitStockUpdated(productId, newStock);

        const fallbackProducts = getFallbackProducts();
        const product = fallbackProducts.find(p => p.id === productId);

        if (!product) {
          throw new Error('Product not found in fallback storage');
        }

        console.log(`✅ Updated stock for product ${productId} in fallback storage`);
        return product;
      },
      `Update Stock ${productId}`
    );
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string): Promise<ServiceResponse<void>> {
    return this.execute(
      async () => {
        console.log(`🔄 Deleting product ${productId} from Supabase...`);

        // Delete product images first
        const { error: imagesError } = await supabase
          .from('product_images')
          .delete()
          .eq('product_id', productId);

        if (imagesError) {
          console.warn(`⚠️ Failed to delete images for product ${productId}:`, imagesError);
        }

        // Delete product
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);

        if (error) {
          throw new Error(`Failed to delete product: ${error.message}`);
        }

        console.log(`✅ Deleted product ${productId} from Supabase`);
      },
      async () => {
        console.log(`🔄 Deleting product ${productId} from fallback storage...`);

        deleteFallbackProduct(productId);

        // Emit event for real-time sync
        eventBus.emitProductDeleted(productId);

        console.log(`✅ Deleted product ${productId} from fallback storage`);
      },
      `Delete Product ${productId}`
    );
  }

  /**
   * Upload product images
   */
  private async uploadProductImages(productId: string, files: File[]): Promise<void> {
    console.log(`🔄 Uploading ${files.length} images for product ${productId}...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error(`File ${file.name} is not an image`);
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error(`File ${file.name} is too large (max 10MB)`);
      }

      const fileName = `${productId}/${Date.now()}-${file.name}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Save image record to database
      const { error: imageError } = await supabase
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: publicUrl,
          is_primary: i === 0,
          display_order: i
        });

      if (imageError) {
        throw new Error(`Failed to save image record: ${imageError.message}`);
      }

      console.log(`✅ Uploaded image ${i + 1}/${files.length} for product ${productId}`);
    }
  }

  /**
   * Add placeholder image for product
   */
  private async addPlaceholderImage(productId: string): Promise<void> {
    const { error } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        image_url: '/placeholder.svg',
        is_primary: true,
        display_order: 0
      });

    if (error) {
      console.warn(`⚠️ Failed to add placeholder image for product ${productId}:`, error);
    }
  }

  /**
   * Get primary image URL from images array
   */
  private getPrimaryImageUrl(images: { id: string; product_id: string; image_url: string; is_primary: boolean; display_order: number; created_at: string }[] | null | undefined): string {
    if (!images || images.length === 0) {
      return '/placeholder.svg';
    }

    const primaryImage = images.find(img => img.is_primary) || images[0];
    return primaryImage.image_url || '/placeholder.svg';
  }

  /**
   * Transform images array to ProductImage interface
   */
  private transformImages(images: { id: string; product_id: string; image_url: string; is_primary: boolean; display_order: number; created_at: string }[] | null | undefined): ProductImage[] {
    if (!images || images.length === 0) {
      return [];
    }

    return images
      .sort((a, b) => a.display_order - b.display_order)
      .map(img => ({
        id: img.id,
        productId: img.product_id,
        imageUrl: img.image_url,
        isPrimary: img.is_primary,
        displayOrder: img.display_order,
        createdAt: img.created_at
      }));
  }
}

// Export singleton instance
export const productService = new ProductService();




