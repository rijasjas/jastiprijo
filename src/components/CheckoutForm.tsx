import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { formatIDR, formatPhoneNumber, isValidPhoneNumber } from '@/utils/currency';
import { saveOrder as saveSupabaseOrder, getSupabaseProducts, updateProductStock } from '@/utils/supabase';
import { generateOrderId } from '@/utils/storage';
import { Order, OrderItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CheckoutFormProps {
  onOrderCreated: (orderId: string) => void;
}

export function CheckoutForm({ onOrderCreated }: CheckoutFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { items: cart, clearCart, totalPrice } = useCart();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!customerName.trim()) {
      toast({
        title: 'Nama diperlukan',
        description: 'Silakan masukkan nama lengkap Anda',
        variant: 'destructive'
      });
      return;
    }

    if (!isValidPhoneNumber(customerPhone)) {
      toast({
        title: 'Nomor HP tidak valid',
        description: 'Masukkan nomor HP yang valid (minimal 10 digit)',
        variant: 'destructive'
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Keranjang kosong',
        description: 'Tambahkan produk terlebih dahulu',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📍 Starting checkout process...');

      // Load latest products to validate stock
      console.log('📦 Validating stock...');
      let products: any[] = [];

      try {
        products = await getSupabaseProducts();
      } catch (supabaseError) {
        console.warn('⚠️ Supabase connection failed, using fallback storage for stock validation');
        // Use fallback storage if Supabase fails
        const { getFallbackProducts } = await import('@/utils/fallbackStorage');
        products = getFallbackProducts();

        if (products.length === 0) {
          toast({
            title: '❌ Tidak dapat memvalidasi stok',
            description: 'Tidak ada produk tersedia untuk divalidasi. Aplikasi dalam mode offline.',
            variant: 'destructive'
          });
          setIsSubmitting(false);
          return;
        }
      }

      const productById = new Map(products.map(p => [p.id, p]));

      // Validate stock for all items
      for (const item of cart) {
        const product = productById.get(item.product.id);
        if (!product) {
          toast({
            title: 'Produk tidak ditemukan',
            description: `${item.product.name} tidak tersedia`,
            variant: 'destructive'
          });
          setIsSubmitting(false);
          return;
        }
        if (product.stock < item.quantity) {
          toast({
            title: 'Stok tidak mencukupi',
            description: `${item.product.name} hanya tersisa ${product.stock}`,
            variant: 'destructive'
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Create order
      console.log('📝 Creating order...');
      const orderId = generateOrderId();
      const orderItems: OrderItem[] = cart.map(item => ({
        id: `${orderId}-${item.product.id}`,
        productId: item.product.id,
        nameSnapshot: item.product.name,
        priceSnapshotIdr: item.product.priceIdr,
        quantity: item.quantity,
        lineTotalIdr: item.product.priceIdr * item.quantity,
      }));

      const order: Order = {
        id: orderId,
        customerName: customerName.trim(),
        customerPhone: formatPhoneNumber(customerPhone),
        items: orderItems,
        subtotalIdr: totalPrice,
        createdAt: new Date().toISOString(),
        status: 'PENDING_PROOF',
        // paymentMethod will be set later when payment is selected
      };

      console.log('💾 Saving order...', orderId);

      // Try to save to Supabase first, fallback to localStorage if fails
      let orderSaved = false;
      try {
        await saveSupabaseOrder(order);
        console.log('✅ Order saved to Supabase');
        orderSaved = true;
      } catch (saveError) {
        console.warn('⚠️ Failed to save order to Supabase, saving to localStorage instead');

        // Save to localStorage as fallback
        const orders = JSON.parse(localStorage.getItem('jastiprijo_offline_orders') || '[]');
        orders.push(order);
        localStorage.setItem('jastiprijo_offline_orders', JSON.stringify(orders));
        console.log('✅ Order saved to localStorage (offline mode)');
        orderSaved = true;
      }

      // Update stock for each item (only if Supabase is working)
      if (orderSaved) {
        console.log('📉 Updating stock...');
        for (const item of cart) {
          const product = productById.get(item.product.id)!;
          const newStock = Math.max(0, product.stock - item.quantity);

          try {
            await updateProductStock(product.id, newStock);
            console.log(`✅ Updated ${product.name}: ${product.stock} → ${newStock}`);
          } catch (stockError) {
            console.warn(`⚠️ Failed to update stock for ${product.name}, continuing...`);
            // Don't fail checkout if stock update fails
            // Update in fallback storage instead
            const { updateFallbackStock } = await import('@/utils/fallbackStorage');
            updateFallbackStock(product.id, newStock);
          }
        }
      }

      // Clear cart and redirect
      clearCart();

      // Show different success message based on where order was saved
      const isOfflineMode = !orderSaved || products.some(p => p.id.startsWith('sample-'));

      toast({
        title: isOfflineMode ? '📱 Pesanan disimpan (Mode Offline)' : '✅ Pesanan berhasil dibuat!',
        description: isOfflineMode
          ? `Order ID: ${orderId}. Pesanan tersimpan di perangkat Anda. Akan diproses saat koneksi tersedia.`
          : `Order ID: ${orderId}`,
        duration: isOfflineMode ? 8000 : 5000
      });

      console.log('✅ Checkout complete, redirecting to payment...');
      onOrderCreated(orderId);

    } catch (error) {
      console.error('❌ Checkout failed:', error);

      // Check if it's a network/DNS error
      const errorMessage = error instanceof Error ? error.message : '';
      const isDNSError = errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('ERR_NAME_NOT_RESOLVED');

      if (isDNSError) {
        toast({
          title: '❌ Tidak dapat terhubung ke server',
          description: 'Periksa koneksi internet Anda atau coba lagi nanti. Aplikasi sedang dalam mode offline.',
          variant: 'destructive',
          duration: 6000
        });
      } else {
        toast({
          title: 'Gagal membuat pesanan',
          description: errorMessage || 'Silakan coba lagi',
          variant: 'destructive'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-2xl shadow-sm border border-border">
      <h2 className="text-xl font-bold text-foreground mb-6">Checkout</h2>

      {/* Order Summary */}
      <div className="mb-6 p-4 bg-accent/50 rounded-xl">
        <h3 className="font-semibold text-foreground mb-3">Ringkasan Pesanan</h3>
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.product.name} × {item.quantity}</span>
              <span className="font-medium">{formatIDR(item.product.priceIdr * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Total:</span>
            <span className="text-primary">{formatIDR(totalPrice)}</span>
          </div>
        </div>
      </div>

      {/* Customer Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nama Lengkap *</Label>
          <Input
            id="name"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Masukkan nama lengkap"
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Nomor HP *</Label>
          <Input
            id="phone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="0812345678"
            className={customerPhone && !isValidPhoneNumber(customerPhone) ? 'border-red-500' : ''}
            required
          />
          {customerPhone && !isValidPhoneNumber(customerPhone) && (
            <p className="text-sm text-red-500 mt-1">
              Nomor HP tidak valid. Masukkan minimal 10 digit.
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? '🔄 Memproses...' : '🚀 Lanjut ke Pembayaran'}
        </Button>
      </form>
    </div>
  );
}