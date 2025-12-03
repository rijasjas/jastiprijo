import { useState, useEffect } from 'react';
import { Plus, Minus, Edit, Trash2, Package, ShoppingCart, Upload, X, Eye, Download, RefreshCw } from 'lucide-react';
import { Product, Order, ProductImage } from '@/types';
import { getSupabaseProducts, saveProduct, deleteProductEnhanced, ultimateDeleteProduct, nuclearDeleteProduct, updateProductStock, getOrders, uploadProductImages, deleteProductImage, setOrderPreparing, setOrderCompleted, setOrderRejected, deleteOrder } from '@/utils/supabase';
import { forceRefreshProducts, debugProductSave, debugStockUpdate, initializeAdminDebug } from '@/utils/adminDebug';
import { getFallbackProducts, saveFallbackProduct, deleteFallbackProduct, updateFallbackStock } from '@/utils/fallbackStorage';
import { eventBus } from '@/utils/eventBus';
import { formatIDR } from '@/utils/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStock, setIsUpdatingStock] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize admin debug utilities
    initializeAdminDebug();
    loadData();
  }, [refreshKey]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading fresh data from database...');
      
      let productsData: Product[] = [];
      let ordersData: Order[] = [];
      let usingFallback = false;
      
      try {
        // Try Supabase first
        const [supabaseProducts, supabaseOrders] = await Promise.all([
          forceRefreshProducts(),
          getOrders()
        ]);
        
        productsData = supabaseProducts;
        ordersData = supabaseOrders;
        console.log('✅ Data loaded from Supabase');
        
      } catch (supabaseError) {
        console.error('❌ Supabase failed, using fallback storage:', supabaseError);
        usingFallback = true;
        
        // Use fallback storage
        productsData = getFallbackProducts();
        ordersData = []; // Orders not stored in fallback
        
        console.log('✅ Data loaded from fallback storage');
      }
      
      console.log('📊 Products loaded:', productsData.length);
      console.log('📊 Orders loaded:', ordersData.length);
      
      // Update state with fresh data
      setProducts(productsData);
      setOrders(ordersData);
      
      // Show success toast
      toast({
        title: usingFallback ? 'Mode Offline' : 'Data berhasil dimuat',
        description: `${productsData.length} produk, ${ordersData.length} pesanan${usingFallback ? ' (offline mode)' : ''}`,
        variant: usingFallback ? 'default' : 'default',
      });
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast({
        title: 'Gagal memuat data',
        description: 'Silakan refresh halaman atau periksa koneksi',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Force refresh function
  const forceRefresh = async () => {
    console.log('🔄 Force refreshing data...');
    setIsLoading(true);
    try {
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProduct = async (product: Partial<Product>, images: File[] = []) => {
    try {
      console.log('💾 Saving product:', product.name, 'with', images.length, 'images');
      
      // Show loading state
      setIsSaving(true);
      toast({
        title: "Menyimpan produk...",
        description: images.length > 0 ? "Mengunggah gambar..." : "Mohon tunggu",
      });
      
      let savedProduct: Product;
      
      try {
        // Try Supabase first
        await debugProductSave(product, images);
        
        // If successful, reload from Supabase
        setTimeout(async () => {
          await loadData();
        }, 500);
        
        toast({
          title: "Produk berhasil disimpan",
          description: images.length > 0 ? `${images.length} gambar berhasil diunggah` : "Data telah diperbarui",
        });
        
      } catch (supabaseError) {
        console.error('❌ Supabase save failed, using fallback:', supabaseError);
        
        // Create product for fallback storage
        savedProduct = {
          id: product.id || `fallback-${Date.now()}`,
          name: product.name || '',
          category: product.category || 'Makanan',
          description: product.description || '',
          priceIdr: product.priceIdr || 0,
          stock: product.stock || 0,
          imageUrl: '/placeholder.svg',
          images: [],
          isActive: product.isActive !== false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Save to fallback storage
        saveFallbackProduct(savedProduct);
        
        // Update local state immediately
        setProducts(prev => {
          const existingIndex = prev.findIndex(p => p.id === savedProduct.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = savedProduct;
            return updated;
          } else {
            return [...prev, savedProduct];
          }
        });
        
        // Emit event for real-time sync
        eventBus.emitProductAdded(savedProduct);
        
        toast({
          title: "Produk disimpan (Mode Offline)",
          description: "Data tersimpan lokal, akan sinkron saat online",
          variant: "default",
        });
      }
      
      setEditingProduct(null);
      setShowProductForm(false);
      
    } catch (error) {
      console.error('❌ Error saving product:', error);
      toast({
        title: "Gagal menyimpan produk",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      console.log('🚨 STARTING ULTIMATE DELETE for product:', id);
      
      // Show loading state
      setIsDeleting(true);
      
      // Strategy 1: Immediately remove from local state to show immediate feedback
      setProducts(prev => prev.filter(p => p.id !== id));
      
      // Strategy 2: Force delete with enhanced function
      await nuclearDeleteProduct(id);
      
      console.log('✅ Product deleted successfully from database');
      
      // Strategy 3: Force immediate data reload
      await loadData();
      
      // Strategy 4: Additional verification - check if product still exists
      setTimeout(async () => {
        try {
          console.log('🔍 Verifying product deletion...');
          await loadData();
          
          // Check if product still exists in state
          const currentProducts = products.filter(p => p.id === id);
          if (currentProducts.length > 0) {
            console.log('⚠️ Product still exists, forcing hard refresh...');
            // Force hard refresh by clearing all data and reloading
            setProducts([]);
            setOrders([]);
            await new Promise(resolve => setTimeout(resolve, 200));
            await loadData();
          }
        } catch (error) {
          console.error('Verification failed:', error);
        }
      }, 500);
      
      // Show success message
      toast({
        title: 'Produk berhasil dihapus',
        description: 'Data telah diperbarui secara paksa',
        variant: 'default',
      });
      
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      
      // If deletion failed, reload data to show current state
      await loadData();
      
      // Show error message
      toast({
        title: 'Gagal menghapus produk',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan dengan foreign key constraint',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStockUpdate = async (id: string, change: number) => {
    const product = products.find(p => p.id === id);
    if (!product) {
      toast({
        title: "Produk tidak ditemukan",
        description: "Silakan refresh halaman",
        variant: "destructive",
      });
      return;
    }
    
    const newStock = Math.max(0, product.stock + change);
    
    try {
      setIsUpdatingStock(id);
      console.log(`📦 Updating stock for ${product.name}: ${product.stock} → ${newStock}`);
      
      // Update local state immediately for better UX
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, stock: newStock } : p
      ));
      
      try {
        // Try Supabase first
        await debugStockUpdate(id, newStock);
        
        toast({
          title: "Stok berhasil diperbarui",
          description: `${product.name}: ${newStock} unit`,
        });
        
        // Force reload data after a delay
        setTimeout(async () => {
          await loadData();
        }, 500);
        
      } catch (supabaseError) {
        console.error('❌ Supabase stock update failed, using fallback:', supabaseError);
        
        // Use fallback storage
        updateFallbackStock(id, newStock);
        
        // Emit event for real-time sync
        eventBus.emitStockUpdated(id, newStock);
        
        toast({
          title: "Stok diperbarui (Mode Offline)",
          description: `${product.name}: ${newStock} unit - tersimpan lokal`,
          variant: "default",
        });
      }
      
    } catch (error) {
      console.error('❌ Error updating stock:', error);
      toast({
        title: "Gagal memperbarui stok",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
      
      // Reload data to show current state
      await loadData();
    } finally {
      setIsUpdatingStock(null);
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const generateOrderPdf = (order: Order) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Bukti Pemesanan', 14, 18);
    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 14, 28);
    doc.text(`Nama: ${order.customerName}`, 14, 36);
    doc.text(`HP: ${order.customerPhone}`, 14, 44);
    doc.text('Detail Pesanan:', 14, 56);
    let y = 64;
    order.items.forEach((it, idx) => {
      doc.text(`${idx + 1}. ${it.nameSnapshot} x ${it.quantity} - Rp ${it.lineTotalIdr.toLocaleString('id-ID')}`, 14, y);
      y += 8;
    });
    y += 4;
    doc.text(`Total: Rp ${order.subtotalIdr.toLocaleString('id-ID')}`, 14, y);
    return doc;
  };

  const handleViewPdf = (order: Order) => {
    const pdfDoc = generateOrderPdf(order);
    // Open PDF in new tab instead of downloading
    const pdfBlob = pdfDoc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      // Cari order terkait untuk keperluan restock
      const order = orders.find(o => o.id === orderId);

      // Jika pesanan berstatus REJECTED (dibatalkan), kembalikan stok
      if (order && order.status === 'REJECTED') {
        for (const item of order.items) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const newStock = (product.stock || 0) + item.quantity;
            await updateProductStock(product.id, newStock);
          }
        }
      }

      // Hapus pesanan
      await deleteOrder(orderId);
      await loadData();
      toast({
        title: "Pesanan berhasil dihapus",
        description: order && order.status === 'REJECTED' ? 'Stok produk telah dikembalikan.' : undefined,
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error deleting order",
        description: "Failed to delete order",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_PROOF':
        return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">Menunggu Bukti</span>;
      case 'PROOF_RECEIVED':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Bukti Diterima</span>;
      case 'VERIFIED':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Terverifikasi</span>;
      case 'PREPARING':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Sedang Disiapkan</span>;
      case 'COMPLETED':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Transaksi Selesai</span>;
      case 'REJECTED':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Transaksi Ditolak</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-muted-foreground">Memuat data...</h2>
              <p className="text-sm text-muted-foreground">Mohon tunggu sebentar</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-border">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package size={20} />
          <span>Produk</span>
        </button>
        
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart size={20} />
          <span>Pesanan</span>
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Status Info */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className="font-semibold">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    products.length > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {products.length > 0 ? 'Online' : 'Loading'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Produk:</span>
                  <span className="ml-2">{products.length} item</span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Pesanan:</span>
                  <span className="ml-2">{orders.length} item</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString('id-ID')}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground">Kelola Produk</h2>
            <div className="flex gap-2">
              <Button
                onClick={forceRefresh}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const { debugSupabaseConnection } = await import('@/utils/adminDebug');
                    await debugSupabaseConnection();
                    toast({
                      title: "Test koneksi berhasil",
                      description: "Supabase berfungsi normal",
                    });
                  } catch (error) {
                    toast({
                      title: "Test koneksi gagal",
                      description: error instanceof Error ? error.message : "Terjadi kesalahan",
                      variant: "destructive",
                    });
                  }
                }}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                Test DB
              </Button>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductForm(true);
                }}
                disabled={isSaving}
                className="bg-primary hover:bg-primary-hover"
              >
                <Plus size={20} className="mr-2" />
                Tambah Produk
              </Button>
            </div>
          </div>

          {/* Product Form Modal */}
          {showProductForm && (
            <ProductForm
              product={editingProduct}
              onSave={handleSaveProduct}
              onCancel={() => {
                setShowProductForm(false);
                setEditingProduct(null);
              }}
            />
          )}

          {/* Products Table */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Produk</th>
                    <th className="text-left p-4 font-semibold">Kategori</th>
                    <th className="text-left p-4 font-semibold">Harga</th>
                    <th className="text-left p-4 font-semibold">Stok</th>
                    <th className="text-left p-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-border">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                            {(() => {
                              // Enhanced image display logic
                              let imageSrc = null;
                              
                              // First check images array
                              if (product.images && product.images.length > 0) {
                                const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
                                if (primaryImage && primaryImage.imageUrl && 
                                    primaryImage.imageUrl.trim() !== '' &&
                                    !primaryImage.imageUrl.includes('placeholder')) {
                                  imageSrc = primaryImage.imageUrl;
                                }
                              }
                              
                              // Fallback to imageUrl
                              if (!imageSrc && product.imageUrl && 
                                  product.imageUrl.trim() !== '' &&
                                  !product.imageUrl.includes('placeholder')) {
                                imageSrc = product.imageUrl;
                              }
                              
                              if (imageSrc) {
                                return (
                                  <img
                                    src={imageSrc}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/placeholder.svg';
                                      target.onerror = null;
                                    }}
                                  />
                                );
                              } else {
                                return (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                    <span className="text-xs text-gray-500">No Image</span>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{product.category}</td>
                      <td className="p-4 font-medium">{formatIDR(product.priceIdr)}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStockUpdate(product.id, -1)}
                            disabled={product.stock === 0 || isUpdatingStock === product.id}
                            className="w-8 h-8 p-0"
                          >
                            <Minus size={14} />
                          </Button>
                          <span className="min-w-[3rem] text-center font-semibold">
                            {isUpdatingStock === product.id ? (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              product.stock
                            )}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStockUpdate(product.id, 1)}
                            disabled={isUpdatingStock === product.id}
                            className="w-8 h-8 p-0"
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowProductForm(true);
                            }}
                            disabled={isSaving}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={isDeleting}
                            className="flex items-center gap-2"
                          >
                            {isDeleting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Menghapus...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Hapus
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-foreground">Pesanan Terbaru</h2>
            <Button
              onClick={forceRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Order ID</th>
                    <th className="text-left p-4 font-semibold">Pelanggan</th>
                    <th className="text-left p-4 font-semibold">Total</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Tanggal</th>
                    <th className="text-left p-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice().reverse().map((order) => (
                    <tr key={order.id} className="border-t border-border">
                      <td className="p-4 font-mono font-bold">{order.id}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{order.customerName}</p>
                          <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                        </div>
                      </td>
                      <td className="p-4 font-semibold">{formatIDR(order.subtotalIdr)}</td>
                      <td className="p-4">{getStatusBadge(order.status)}</td>
                      <td className="p-4 text-sm">
                        {new Date(order.createdAt).toLocaleString('id-ID', {
                          timeZone: 'Asia/Jakarta'
                        })}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewOrder(order)}
                            disabled={isLoading}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewPdf(order)}
                            disabled={isLoading}
                          >
                            <Download size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={async () => { 
                              try {
                                await setOrderCompleted(order.id); 
                                await loadData(); 
                              } catch (error) {
                                console.error('Error completing order:', error);
                              }
                            }}
                            disabled={isLoading}
                          >
                            Selesai
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={async () => { 
                              try {
                                await setOrderRejected(order.id); 
                                await loadData(); 
                              } catch (error) {
                                console.error('Error rejecting order:', error);
                              }
                            }}
                            disabled={isLoading}
                          >
                            Tolak
                          </Button>
                          {order.status === 'REJECTED' && (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeleteOrder(order.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {orders.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Belum ada pesanan
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Detail Pesanan</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOrderModal(false)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <X size={20} />
                )}
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="font-semibold">Order ID: {selectedOrder.id}</p>
                <p>Nama: {selectedOrder.customerName}</p>
                <p>HP: {selectedOrder.customerPhone}</p>
                <p>Status: {getStatusBadge(selectedOrder.status)}</p>
              </div>
              
              <div>
                <p className="font-semibold mb-2">Item Pesanan:</p>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm mb-1">
                    <span>{item.nameSnapshot} x {item.quantity}</span>
                    <span>{formatIDR(item.lineTotalIdr)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatIDR(selectedOrder.subtotalIdr)}</span>
                  </div>
                </div>
              </div>
              
              {selectedOrder.paymentProof && (
                <div>
                  <p className="font-semibold mb-2">Bukti Pembayaran:</p>
                  <img
                    src={selectedOrder.paymentProof.fileUrl}
                    alt="Bukti pembayaran"
                    className="w-full rounded-xl border border-border max-h-48 object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProductFormProps {
  product: Product | null;
  onSave: (product: Partial<Product>, images: File[]) => void;
  onCancel: () => void;
}

function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'Makanan',
    description: product?.description || '',
    priceIdr: product?.priceIdr || 0,
    stock: product?.stock || 0,
    imageUrl: product?.imageUrl || '/placeholder-food-1.jpg',
    id: product?.id || undefined,
    isActive: product?.isActive ?? true,
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>(product?.images || []);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Form submission started...');
    console.log('📋 Form data:', formData);
    console.log('📸 Selected images:', selectedImages.length);
    
    // Validate form data
    if (!formData.name || formData.name.trim() === '') {
      alert('Nama produk harus diisi');
      return;
    }
    
    if (!formData.priceIdr || formData.priceIdr <= 0) {
      alert('Harga harus lebih dari 0');
      return;
    }
    
    if (formData.stock < 0) {
      alert('Stok tidak boleh negatif');
      return;
    }
    
    // Prepare clean data
    const cleanFormData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      priceIdr: parseInt(formData.priceIdr.toString()),
      stock: parseInt(formData.stock.toString()),
      category: formData.category || 'Makanan',
      isActive: formData.isActive !== false
    };
    
    console.log('🧹 Clean form data:', cleanFormData);
    
    try {
      setIsSaving(true);
      console.log('💾 Calling onSave...');
      await onSave(cleanFormData, selectedImages);
      console.log('✅ onSave completed successfully');
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Terjadi kesalahan'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles = files.filter(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} bukan gambar yang valid`);
        return false;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} terlalu besar (maksimal 10MB)`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      console.log(`📸 Added ${validFiles.length} valid images`);
    }
    
    // Clear the input
    e.target.value = '';
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingImage = async (imageId: string) => {
    try {
      await deleteProductImage(imageId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {product ? 'Edit Produk' : 'Tambah Produk'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <X size={20} />
                )}
              </Button>
            </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Produk</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Kategori</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Makanan">Makanan</SelectItem>
                <SelectItem value="Snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="price">Harga (IDR)</Label>
            <Input
              id="price"
              type="number"
              value={formData.priceIdr}
              onChange={(e) => setFormData({ ...formData, priceIdr: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <Label htmlFor="stock">Stok</Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div>
              <Label>Gambar Saat Ini</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {existingImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <div className="w-full h-24 rounded-lg border overflow-hidden bg-gray-100">
                      {image.imageUrl && 
                       image.imageUrl.trim() !== '' &&
                       !image.imageUrl.includes('placeholder') ? (
                        <img
                          src={image.imageUrl}
                          alt="Product"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                            target.onerror = null;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-xs text-gray-500">No Image</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingImage(image.id)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    {image.isPrimary && (
                      <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Utama
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <Label htmlFor="images">Tambah Gambar</Label>
            <div className="mt-2">
              <label htmlFor="images" className="cursor-pointer">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-accent/50 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Klik untuk upload gambar atau drag & drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG hingga 10MB
                  </p>
                </div>
              </label>
              <input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Selected Images Preview */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeSelectedImage(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    {index === 0 && existingImages.length === 0 && (
                      <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Utama
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1" disabled={isSaving}>
              {isSaving ? 'Tutup' : 'Batal'}
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary-hover" disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}