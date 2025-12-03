import { useState, lazy, Suspense } from 'react';
import { Header } from '@/components/Header';
const ProductCatalog = lazy(() => import('@/components/ProductCatalog').then(m => ({ default: m.ProductCatalog })));
import { CartModal } from '@/components/CartModal';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const [showCart, setShowCart] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => setShowCart(true)} />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">JastipRijo</h1>
          <p className="text-muted-foreground mb-2">Memenuhi kebutuhan:</p>
          <div className="text-muted-foreground mb-2">
            <p>1. Kangen Dengan Masakan Asli Khas Manado</p>
            <p>2. Penasaran Akan Makanan Asli Khas Manado</p>
            <p>3. Sebagai Hadiah Untuk Keluarga, Teman, dan Saudara</p>
          </div>
          <p className="text-sm font-bold text-primary">Exclusive only for 13 September 2025, STOK SANGAT TERBATAS !</p>
        </div>
        
        <Suspense fallback={
          <div className="space-y-4">
            <div className="flex overflow-x-auto space-x-3 pb-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-20 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        }>
          <ProductCatalog />
        </Suspense>
      </main>

      <CartModal 
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onCheckout={handleCheckout}
      />
    </div>
  );
};

export default Index;
