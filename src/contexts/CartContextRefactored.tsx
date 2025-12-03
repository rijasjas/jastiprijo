/**
 * Cart Context - Optimized for Performance
 * Lightweight and fast cart state management
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { CartItem, Product } from '@/types';
import { cartService } from '@/services/CartService';

interface CartContextType {
  // State
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isEmpty: boolean;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  // State - Simplified
  const [items, setItems] = useState<CartItem[]>([]);

  // Computed values
  const totalItems = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0), 
    [items]
  );

  const totalPrice = useMemo(() => 
    items.reduce((sum, item) => sum + (item.product.priceIdr * item.quantity), 0), 
    [items]
  );

  const isEmpty = useMemo(() => items.length === 0, [items.length]);

  // Load cart on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const response = await cartService.getCart();
        if (response.success && response.data) {
          setItems(response.data);
        }
      } catch (error) {
        console.error('Load cart error:', error);
      }
    };
    loadCart();
  }, []);

  // Add item to cart - Simplified
  const addItem = useCallback((product: Product, quantity: number = 1) => {
    if (quantity <= 0) return;

    cartService.addItem(product, quantity)
      .then(response => {
        if (response.success && response.data) {
          setItems(response.data);
        }
      })
      .catch(error => console.error('Add item error:', error));
  }, []);

  // Remove item from cart - Simplified
  const removeItem = useCallback((productId: string) => {
    cartService.removeItem(productId)
      .then(response => {
        if (response.success && response.data) {
          setItems(response.data);
        }
      })
      .catch(error => console.error('Remove item error:', error));
  }, []);

  // Update item quantity - Simplified
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 0) return;

    cartService.updateQuantity(productId, quantity)
      .then(response => {
        if (response.success && response.data) {
          setItems(response.data);
        }
      })
      .catch(error => console.error('Update quantity error:', error));
  }, []);

  // Clear entire cart - Simplified
  const clearCart = useCallback(() => {
    cartService.clearCart()
      .then(response => {
        if (response.success) {
          setItems([]);
        }
      })
      .catch(error => console.error('Clear cart error:', error));
  }, []);

  // Check if product is in cart
  const isInCart = useCallback((productId: string): boolean => {
    return items.some(item => item.product.id === productId);
  }, [items]);

  // Get item quantity in cart
  const getItemQuantity = useCallback((productId: string): number => {
    const item = items.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  }, [items]);

  // Refresh cart - Simplified
  const refreshCart = useCallback(() => {
    cartService.getCart()
      .then(response => {
        if (response.success && response.data) {
          setItems(response.data);
        }
      })
      .catch(error => console.error('Refresh cart error:', error));
  }, []);

  // Context value - Optimized
  const value: CartContextType = useMemo(() => ({
    items,
    totalItems,
    totalPrice,
    isEmpty,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
    refreshCart
  }), [
    items,
    totalItems,
    totalPrice,
    isEmpty,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
    refreshCart
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// Hook to use cart context
export function useCart(): CartContextType {
  const context = useContext(CartContext);
  
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  
  return context;
}

// Hook for cart summary
export function useCartSummary() {
  const { totalItems, totalPrice, isEmpty } = useCart();
  
  return {
    totalItems,
    totalPrice,
    isEmpty
  };
}

// Hook for cart actions
export function useCartActions() {
  const { addItem, removeItem, updateQuantity, clearCart, refreshCart } = useCart();
  
  return {
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    refreshCart
  };
}




