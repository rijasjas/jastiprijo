/**
 * Cart Service - Clean Architecture Implementation
 * Handles all cart-related operations with proper state management
 */

import { BaseService, ServiceResponse } from './BaseService';
import { CartItem, Product } from '@/types';

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isEmpty: boolean;
}

export class CartService extends BaseService {
  private readonly CART_KEY = 'jastiprijo_cart';

  constructor() {
    super({
      retries: 1,
      timeout: 5000
    });
  }

  /**
   * Get cart from localStorage
   */
  async getCart(): Promise<ServiceResponse<CartItem[]>> {
    return this.execute(
      async () => {
        console.log('🔄 Loading cart from localStorage...');
        
        const cartData = localStorage.getItem(this.CART_KEY);
        const cart: CartItem[] = cartData ? JSON.parse(cartData) : [];
        
        console.log(`✅ Loaded ${cart.length} items from cart`);
        return cart;
      },
      async () => {
        console.log('🔄 Cart fallback - returning empty cart...');
        return [];
      },
      'Get Cart'
    );
  }

  /**
   * Save cart to localStorage
   */
  async saveCart(cart: CartItem[]): Promise<ServiceResponse<void>> {
    return this.execute(
      async () => {
        console.log('🔄 Saving cart to localStorage...');
        
        localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
        
        console.log(`✅ Saved ${cart.length} items to cart`);
      },
      async () => {
        console.log('🔄 Cart save fallback - no action needed...');
      },
      'Save Cart'
    );
  }

  /**
   * Add item to cart
   */
  async addItem(product: Product, quantity: number = 1): Promise<ServiceResponse<CartItem[]>> {
    return this.execute(
      async () => {
        console.log(`🔄 Adding ${quantity}x ${product.name} to cart...`);
        
        const cartResponse = await this.getCart();
        if (!cartResponse.success || !cartResponse.data) {
          throw new Error('Failed to load cart');
        }

        const cart = cartResponse.data;
        const existingItemIndex = cart.findIndex(item => item.product.id === product.id);

        let updatedCart: CartItem[];

        if (existingItemIndex >= 0) {
          // Update existing item
          updatedCart = cart.map((item, index) => 
            index === existingItemIndex 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Add new item
          const newItem: CartItem = {
            id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            product,
            quantity,
            addedAt: new Date().toISOString()
          };
          updatedCart = [...cart, newItem];
        }

        // Save updated cart
        const saveResponse = await this.saveCart(updatedCart);
        if (!saveResponse.success) {
          throw new Error('Failed to save cart');
        }

        console.log(`✅ Added ${quantity}x ${product.name} to cart`);
        return updatedCart;
      },
      async () => {
        console.log('🔄 Cart add fallback - returning current cart...');
        const cartResponse = await this.getCart();
        return cartResponse.data || [];
      },
      `Add Item ${product.name}`
    );
  }

  /**
   * Remove item from cart
   */
  async removeItem(productId: string): Promise<ServiceResponse<CartItem[]>> {
    return this.execute(
      async () => {
        console.log(`🔄 Removing product ${productId} from cart...`);
        
        const cartResponse = await this.getCart();
        if (!cartResponse.success || !cartResponse.data) {
          throw new Error('Failed to load cart');
        }

        const updatedCart = cartResponse.data.filter(item => item.product.id !== productId);
        
        const saveResponse = await this.saveCart(updatedCart);
        if (!saveResponse.success) {
          throw new Error('Failed to save cart');
        }

        console.log(`✅ Removed product ${productId} from cart`);
        return updatedCart;
      },
      async () => {
        console.log('🔄 Cart remove fallback - returning current cart...');
        const cartResponse = await this.getCart();
        return cartResponse.data || [];
      },
      `Remove Item ${productId}`
    );
  }

  /**
   * Update item quantity
   */
  async updateQuantity(productId: string, quantity: number): Promise<ServiceResponse<CartItem[]>> {
    if (quantity < 0) {
      return {
        success: false,
        error: 'Quantity cannot be negative',
        message: 'Validation failed'
      };
    }

    return this.execute(
      async () => {
        console.log(`🔄 Updating quantity for product ${productId} to ${quantity}...`);
        
        const cartResponse = await this.getCart();
        if (!cartResponse.success || !cartResponse.data) {
          throw new Error('Failed to load cart');
        }

        let updatedCart: CartItem[];

        if (quantity === 0) {
          // Remove item if quantity is 0
          updatedCart = cartResponse.data.filter(item => item.product.id !== productId);
        } else {
          // Update quantity
          updatedCart = cartResponse.data.map(item =>
            item.product.id === productId
              ? { ...item, quantity }
              : item
          );
        }
        
        const saveResponse = await this.saveCart(updatedCart);
        if (!saveResponse.success) {
          throw new Error('Failed to save cart');
        }

        console.log(`✅ Updated quantity for product ${productId} to ${quantity}`);
        return updatedCart;
      },
      async () => {
        console.log('🔄 Cart update fallback - returning current cart...');
        const cartResponse = await this.getCart();
        return cartResponse.data || [];
      },
      `Update Quantity ${productId}`
    );
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<ServiceResponse<void>> {
    return this.execute(
      async () => {
        console.log('🔄 Clearing cart...');
        
        localStorage.removeItem(this.CART_KEY);
        
        console.log('✅ Cart cleared');
      },
      async () => {
        console.log('🔄 Cart clear fallback - no action needed...');
      },
      'Clear Cart'
    );
  }

  /**
   * Get cart summary
   */
  async getCartSummary(): Promise<ServiceResponse<CartSummary>> {
    return this.execute(
      async () => {
        console.log('🔄 Calculating cart summary...');
        
        const cartResponse = await this.getCart();
        if (!cartResponse.success || !cartResponse.data) {
          throw new Error('Failed to load cart');
        }

        const items = cartResponse.data;
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => sum + (item.product.priceIdr * item.quantity), 0);

        const summary: CartSummary = {
          items,
          totalItems,
          totalPrice,
          isEmpty: items.length === 0
        };

        console.log(`✅ Cart summary: ${totalItems} items, ${totalPrice} IDR`);
        return summary;
      },
      async () => {
        console.log('🔄 Cart summary fallback - returning empty summary...');
        return {
          items: [],
          totalItems: 0,
          totalPrice: 0,
          isEmpty: true
        };
      },
      'Get Cart Summary'
    );
  }

  /**
   * Check if product is in cart
   */
  async isInCart(productId: string): Promise<ServiceResponse<boolean>> {
    return this.execute(
      async () => {
        console.log(`🔄 Checking if product ${productId} is in cart...`);
        
        const cartResponse = await this.getCart();
        if (!cartResponse.success || !cartResponse.data) {
          throw new Error('Failed to load cart');
        }

        const isInCart = cartResponse.data.some(item => item.product.id === productId);
        
        console.log(`✅ Product ${productId} is ${isInCart ? 'in' : 'not in'} cart`);
        return isInCart;
      },
      async () => {
        console.log('🔄 Cart check fallback - returning false...');
        return false;
      },
      `Check Cart ${productId}`
    );
  }

  /**
   * Get item quantity in cart
   */
  async getItemQuantity(productId: string): Promise<ServiceResponse<number>> {
    return this.execute(
      async () => {
        console.log(`🔄 Getting quantity for product ${productId}...`);
        
        const cartResponse = await this.getCart();
        if (!cartResponse.success || !cartResponse.data) {
          throw new Error('Failed to load cart');
        }

        const item = cartResponse.data.find(item => item.product.id === productId);
        const quantity = item ? item.quantity : 0;
        
        console.log(`✅ Product ${productId} quantity: ${quantity}`);
        return quantity;
      },
      async () => {
        console.log('🔄 Cart quantity fallback - returning 0...');
        return 0;
      },
      `Get Quantity ${productId}`
    );
  }
}

// Export singleton instance
export const cartService = new CartService();




