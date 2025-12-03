/**
 * Product Catalog - Refactored with Clean Architecture
 * Clean, maintainable, and robust product display
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductCard } from './ProductCard';
import { Product } from '@/types';
import { productService } from '@/services/ProductService';
import { errorService, ToastErrorHandler } from '@/services/ErrorService';
import { eventBus } from '@/utils/eventBus';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductCatalogState {
  products: Product[];
  filteredProducts: Product[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string;
  sortBy: 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name';
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  lastUpdated: Date | null;
}

const CATEGORIES = [
  { value: 'all', label: 'Semua' },
  { value: 'Makanan', label: 'Makanan' },
  { value: 'Snack', label: 'Snack' },
  { value: 'Minuman', label: 'Minuman' },
  { value: 'Lainnya', label: 'Lainnya' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'price-low', label: 'Harga Terendah' },
  { value: 'price-high', label: 'Harga Tertinggi' },
  { value: 'name', label: 'Nama A-Z' }
];

export function ProductCatalogRefactored() {
  const { toast } = useToast();
  
  // State management
  const [state, setState] = useState<ProductCatalogState>({
    products: [],
    filteredProducts: [],
    isLoading: true,
    error: null,
    searchQuery: '',
    selectedCategory: 'all',
    sortBy: 'newest',
    connectionStatus: 'checking',
    lastUpdated: null
  });

  // Initialize error handling
  useEffect(() => {
    const toastHandler = new ToastErrorHandler(toast);
    errorService.registerHandler(toastHandler);
    
    return () => {
      errorService.unregisterHandler(toastHandler);
    };
  }, [toast]);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Set up real-time event listeners
  useEffect(() => {
    const handleProductAdded = (product: Product) => {
      console.log('🔄 Product added event received:', product.name);
      setState(prev => {
        const exists = prev.products.find(p => p.id === product.id);
        if (exists) {
          const updatedProducts = prev.products.map(p => p.id === product.id ? product : p);
          return {
            ...prev,
            products: updatedProducts,
            lastUpdated: new Date()
          };
        } else {
          return {
            ...prev,
            products: [product, ...prev.products],
            lastUpdated: new Date()
          };
        }
      });
    };

    const handleProductUpdated = (product: Product) => {
      console.log('🔄 Product updated event received:', product.name);
      setState(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === product.id ? product : p),
        lastUpdated: new Date()
      }));
    };

    const handleProductDeleted = (productId: string) => {
      console.log('🔄 Product deleted event received:', productId);
      setState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== productId),
        lastUpdated: new Date()
      }));
    };

    const handleStockUpdated = (data: { productId: string, newStock: number }) => {
      console.log('🔄 Stock updated event received:', data);
      setState(prev => ({
        ...prev,
        products: prev.products.map(p => 
          p.id === data.productId ? { ...p, stock: data.newStock } : p
        ),
        lastUpdated: new Date()
      }));
    };

    // Register event listeners
    eventBus.onProductAdded(handleProductAdded);
    eventBus.onProductUpdated(handleProductUpdated);
    eventBus.onProductDeleted(handleProductDeleted);
    eventBus.onStockUpdated(handleStockUpdated);

    return () => {
      eventBus.off('product:added', handleProductAdded);
      eventBus.off('product:updated', handleProductUpdated);
      eventBus.off('product:deleted', handleProductDeleted);
      eventBus.off('stock:updated', handleStockUpdated);
    };
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing catalog...');
      loadProducts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await productService.getProducts();
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          products: response.data!,
          connectionStatus: 'connected',
          lastUpdated: new Date()
        }));
      } else {
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          error: response.error || 'Failed to load products'
        }));
      }

    } catch (error) {
      const appError = errorService.handleServiceError('Load Products', error, 'ProductCatalog');
      setState(prev => ({
        ...prev,
        error: appError.message,
        connectionStatus: 'disconnected'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...state.products];

    // Filter by category
    if (state.selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === state.selectedCategory);
    }

    // Filter by search query
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (state.sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'price-low':
          return a.priceIdr - b.priceIdr;
        case 'price-high':
          return b.priceIdr - a.priceIdr;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [state.products, state.selectedCategory, state.searchQuery, state.sortBy]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback((category: string) => {
    setState(prev => ({ ...prev, selectedCategory: category }));
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((sortBy: string) => {
    setState(prev => ({ ...prev, sortBy: sortBy as any }));
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadProducts();
  }, [loadProducts]);

  // Render connection status
  const renderConnectionStatus = () => {
    const statusConfig = {
      connected: { 
        icon: '🟢', 
        text: 'Online',
        color: 'text-green-600'
      },
      disconnected: { 
        icon: '🔴', 
        text: 'Offline',
        color: 'text-red-600'
      },
      checking: { 
        icon: '🟡', 
        text: 'Checking...',
        color: 'text-yellow-600'
      }
    };

    const config = statusConfig[state.connectionStatus];

    return (
      <div className={`flex items-center space-x-2 text-sm ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.text}</span>
        {state.lastUpdated && (
          <span className="text-muted-foreground">
            • {state.lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  };

  // Render filters
  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Filter & Pencarian</span>
        </CardTitle>
        <CardDescription>
          Temukan produk yang Anda cari
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Cari produk..."
            value={state.searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kategori</label>
            <Select value={state.selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Urutkan</label>
            <Select value={state.sortBy} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih urutan" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters */}
        <div className="flex flex-wrap gap-2">
          {state.selectedCategory !== 'all' && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => handleCategoryChange('all')}>
              {CATEGORIES.find(c => c.value === state.selectedCategory)?.label} ×
            </Badge>
          )}
          {state.searchQuery && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => handleSearch('')}>
              "{state.searchQuery}" ×
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Render loading state
  const renderLoading = () => (
    <div className="space-y-6">
      {renderFilters()}
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
      {renderFilters()}
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
      {renderFilters()}
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Tidak ada produk</h3>
        <p className="text-muted-foreground mb-4">
          {state.searchQuery || state.selectedCategory !== 'all' 
            ? 'Tidak ada produk yang sesuai dengan filter Anda'
            : 'Belum ada produk yang tersedia'
          }
        </p>
        {(state.searchQuery || state.selectedCategory !== 'all') && (
          <Button variant="outline" onClick={() => {
            handleSearch('');
            handleCategoryChange('all');
          }}>
            Hapus Filter
          </Button>
        )}
      </div>
    </div>
  );

  // Render products grid
  const renderProducts = () => (
    <div className="space-y-6">
      {renderFilters()}
      
      {/* Results Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">
            {filteredProducts.length} Produk
          </h2>
          {renderConnectionStatus()}
        </div>
        <Button onClick={handleRefresh} disabled={state.isLoading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${state.isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

// Import Package icon for empty state
import { Package } from 'lucide-react';




