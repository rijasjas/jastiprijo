export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  priceIdr: number;
  price_idr?: number; // Supabase column name
  stock: number;
  imageUrl: string;
  images?: ProductImage[];
  isActive: boolean;
  is_active?: boolean; // Supabase column name
  createdAt: string;
  created_at?: string; // Supabase column name
  updatedAt: string;
  updated_at?: string; // Supabase column name
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  addedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  priceSnapshotIdr: number;
  quantity: number;
  lineTotalIdr: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  subtotalIdr: number;
  createdAt: string;
  status: 'PENDING_PROOF' | 'PROOF_RECEIVED' | 'VERIFIED' | 'PREPARING' | 'COMPLETED' | 'REJECTED';
  paymentProof?: PaymentProof;
  paymentMethod?: 'manual' | 'qr' | 'qris';
  transactionId?: string;
}

export interface PaymentProof {
  id: string;
  orderId: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface AdminSession {
  isAuthenticated: boolean;
  loginTime?: string;
}