/**
 * Product Catalog - Optimized for Performance
 * Simplified, fast, and lightweight product display
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductCard } from './ProductCard';
import { Product } from '@/types';
import { productService } from '@/services/ProductService';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductCatalogState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Semua' },
  { value: 'Makanan', label: 'Makanan' },
  { value: 'Snack', label: 'Snack' },
  { value: 'Minuman', label: 'Minuman' },
  { value: 'Lainnya', label: 'Lainnya' }
];


export function ProductCatalogNew() {
  const { toast } = useToast();
  
  // State management - Simplified
  const [state, setState] = useState<ProductCatalogState>({
    products: [],
    isLoading: true,
    error: null,
    selectedCategory: 'all'
  });

  // Load products on mount only
  useEffect(() => {
    loadProducts();
  }, []);

  // Load products - With better error recovery
  const loadProducts = useCallback(async () => {
    // Don't show loading if we already have products
    if (state.products.length === 0) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }
    
    try {
      const response = await productService.getProducts();
      
      if (response.success && response.data) {
        console.log('✅ Products loaded successfully:', response.data.length);
        setState(prev => ({ ...prev, products: response.data!, isLoading: false, error: null }));
      } else {
        console.error('❌ Failed to load products:', response.error);
        setState(prev => ({ 
          ...prev, 
          error: response.error || 'Gagal memuat produk', 
          isLoading: false 
        }));
        toast({ 
          title: 'Gagal memuat produk', 
          description: response.error || 'Silakan coba lagi', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('❌ Load products error:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Gagal memuat produk. Silakan refresh halaman.', 
        isLoading: false 
      }));
      toast({ 
        title: 'Error', 
        description: 'Gagal memuat produk. Silakan refresh halaman.', 
        variant: 'destructive' 
      });
    }
  }, [toast, state.products.length]);

  // Manual refresh only - No auto-refresh for better performance

  // Filter products by category - Optimized
  const filteredProducts = useMemo(() => {
    if (state.selectedCategory === 'all') return state.products;
    return state.products.filter(product => product.category === state.selectedCategory);
  }, [state.products, state.selectedCategory]);

  // Handle category change
  const handleCategoryChange = useCallback((category: string) => {
    setState(prev => ({ ...prev, selectedCategory: category }));
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadProducts();
  }, [loadProducts]);



  // Render category filter only
  const renderCategoryFilter = () => (
    <div className="mb-6">
      <div className="flex overflow-x-auto scrollbar-hide space-x-3 pb-2">
        {CATEGORIES.map(category => (
          <button
            key={category.value}
            onClick={() => handleCategoryChange(category.value)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-colors ${
              state.selectedCategory === category.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );

  // Render loading state
  const renderLoading = () => (
    <div className="space-y-6">
      {renderCategoryFilter()}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square bg-muted animate-pulse rounded-lg" />
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="space-y-6">
      {renderCategoryFilter()}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {state.error || 'Gagal memuat produk. Silakan coba lagi.'}
        </AlertDescription>
      </Alert>
      <div className="text-center">
        <Button onClick={handleRefresh} disabled={state.isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${state.isLoading ? 'animate-spin' : ''}`} />
          Coba Lagi
        </Button>
      </div>
    </div>
  );

  // Render empty state
  const renderEmpty = () => (
    <div className="space-y-6">
      {renderCategoryFilter()}
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Tidak ada produk</h3>
        <p className="text-muted-foreground mb-4">
          {state.selectedCategory !== 'all' 
            ? 'Tidak ada produk dalam kategori ini'
            : 'Belum ada produk yang tersedia'
          }
        </p>
        {state.selectedCategory !== 'all' && (
          <Button variant="outline" onClick={() => handleCategoryChange('all')}>
            Lihat Semua Kategori
          </Button>
        )}
      </div>
    </div>
  );

  // Render products grid - Simplified
  const renderProducts = () => (
    <div className="space-y-4">
      {renderCategoryFilter()}
      
      {/* Results Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm text-muted-foreground">
          {filteredProducts.length} Produk
        </h2>
        <Button onClick={handleRefresh} disabled={state.isLoading} variant="ghost" size="sm">
          <RefreshCw className={`h-4 w-4 ${state.isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );

  // Main render
  if (state.isLoading && state.products.length === 0) {
    return renderLoading();
  }

  if (state.error && state.products.length === 0) {
    return renderError();
  }

  if (filteredProducts.length === 0) {
    return renderEmpty();
  }

  return renderProducts();
}
