import { CartItem, Order, Product, AdminSession } from '@/types';

// Local storage keys
const CART_KEY = 'jastip_cart';
const ORDERS_KEY = 'jastip_orders';
const PRODUCTS_KEY = 'jastip_products';
const ADMIN_KEY = 'jastip_admin';

// Cart operations
export function getCart(): CartItem[] {
  try {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
}

// Order operations
export function getOrders(): Order[] {
  try {
    const orders = localStorage.getItem(ORDERS_KEY);
    return orders ? JSON.parse(orders) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: Order): void {
  const orders = getOrders();
  const existingIndex = orders.findIndex(o => o.id === order.id);
  
  if (existingIndex >= 0) {
    orders[existingIndex] = order;
  } else {
    orders.push(order);
  }
  
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function getOrderById(id: string): Order | null {
  const orders = getOrders();
  return orders.find(o => o.id === id) || null;
}

// Product operations
export function getProducts(): Product[] {
  try {
    const products = localStorage.getItem(PRODUCTS_KEY);
    return products ? JSON.parse(products) : getDefaultProducts();
  } catch {
    return getDefaultProducts();
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

// Admin session
export function getAdminSession(): AdminSession {
  try {
    const session = localStorage.getItem(ADMIN_KEY);
    return session ? JSON.parse(session) : { isAuthenticated: false };
  } catch {
    return { isAuthenticated: false };
  }
}

export function saveAdminSession(session: AdminSession): void {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_KEY);
}

// Generate short order ID
export function generateOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'JR';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Default products for demo
function getDefaultProducts(): Product[] {
  return [
    {
      id: '1',
      name: 'Nasi Gudeg Jogja',
      category: 'Makanan',
      description: 'Nasi gudeg khas Jogja dengan ayam dan telor',
      priceIdr: 25000,
      stock: 15,
      imageUrl: '/placeholder-food-1.jpg',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Bakso Malang',
      category: 'Makanan',
      description: 'Bakso malang dengan tahu dan pangsit',
      priceIdr: 20000,
      stock: 25,
      imageUrl: '/placeholder-food-2.jpg',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Keripik Singkong',
      category: 'Snack',
      description: 'Keripik singkong renyah dan gurih',
      priceIdr: 12000,
      stock: 30,
      imageUrl: '/placeholder-snack-1.jpg',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Sate Ayam',
      category: 'Makanan',
      description: 'Sate ayam dengan bumbu kacang',
      priceIdr: 18000,
      stock: 12,
      imageUrl: '/placeholder-food-3.jpg',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '5',
      name: 'Pisang Goreng',
      category: 'Snack',
      description: 'Pisang goreng crispy dengan meses',
      priceIdr: 10000,
      stock: 20,
      imageUrl: '/placeholder-snack-2.jpg',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '6',
      name: 'Mie Goreng',
      category: 'Makanan',
      description: 'Mie goreng dengan telur dan sayuran',
      priceIdr: 15000,
      stock: 18,
      imageUrl: '/placeholder-food-4.jpg',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}