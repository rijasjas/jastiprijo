/**
 * Admin Panel - Refactored with Clean Architecture
 * Clean, maintainable, and robust admin interface
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, Edit, Trash2, Package, ShoppingCart, Upload, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Product, Order } from '@/types';
import { productService } from '@/services/ProductService';
import { errorService, ToastErrorHandler } from '@/services/ErrorService';
import { formatIDR } from '@/utils/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';

interface AdminPanelState {
  products: Product[];
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  activeTab: 'products' | 'orders';
  showProductForm: boolean;
  editingProduct: Product | null;
  selectedImages: File[];
  imagePreviewUrls: string[]; // For proper cleanup of object URLs
  updatingStockIds: Set<string>; // Track which products are being updated
  connectionStatus: 'connected' | 'disconnected' | 'checking';
}

export function AdminPanel() {
  const { toast } = useToast();

  // State management
  const [state, setState] = useState<AdminPanelState>({
    products: [],
    orders: [],
    isLoading: false,
    error: null,
    activeTab: 'products',
    showProductForm: false,
    editingProduct: null,
    selectedImages: [],
    imagePreviewUrls: [],
    updatingStockIds: new Set(),
    connectionStatus: 'checking'
  });

  // Initialize error handling
  useEffect(() => {
    const toastHandler = new ToastErrorHandler(toast);
    errorService.registerHandler(toastHandler);

    return () => {
      errorService.unregisterHandler(toastHandler);
    };
  }, [toast]);

  // Load data on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load all data
  // Note: Empty dependency array is safe here because we use functional setState updates
  // and services are singleton instances that don't change
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const productsResponse = await productService.getProducts();

      if (productsResponse.success && productsResponse.data) {
        setState(prev => ({
          ...prev,
          products: productsResponse.data!,
          connectionStatus: 'connected'
        }));
      } else {
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          error: productsResponse.error || 'Failed to load products'
        }));
      }

    } catch (error) {
      const appError = errorService.handleServiceError('Load Data', error, 'AdminPanel');
      setState(prev => ({
        ...prev,
        error: appError.message,
        connectionStatus: 'disconnected'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Handle product save
  const handleSaveProduct = useCallback(async (productData: any) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      let response;

      if (state.editingProduct) {
        // Update existing product
        response = await productService.updateProduct({
          id: state.editingProduct.id,
          ...productData,
          images: state.selectedImages
        });
      } else {
        // Create new product
        response = await productService.createProduct({
          ...productData,
          images: state.selectedImages
        });
      }

      if (response.success && response.data) {
        // Update local state
        setState(prev => {
          const products = [...prev.products];
          const existingIndex = products.findIndex(p => p.id === response.data!.id);

          if (existingIndex >= 0) {
            products[existingIndex] = response.data!;
          } else {
            products.unshift(response.data!);
          }

          // Cleanup preview URLs before clearing
          prev.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));

          return {
            ...prev,
            products,
            showProductForm: false,
            editingProduct: null,
            selectedImages: [],
            imagePreviewUrls: []
          };
        });

        toast({
          title: "Produk Disimpan",
          description: `Produk ${response.data.name} berhasil disimpan`,
        });
      } else {
        throw new Error(response.error || 'Failed to save product');
      }

    } catch (error) {
      errorService.handleServiceError('Save Product', error, 'AdminPanel');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.editingProduct, state.selectedImages, toast]);

  // Handle stock update
  const handleStockUpdate = useCallback(async (productId: string, newStock: number) => {
    // Add to updating set to prevent race conditions
    setState(prev => ({
      ...prev,
      updatingStockIds: new Set(prev.updatingStockIds).add(productId)
    }));

    try {
      const response = await productService.updateStock(productId, newStock);

      if (response.success && response.data) {
        // Update local state
        setState(prev => ({
          ...prev,
          products: prev.products.map(p =>
            p.id === productId ? response.data! : p
          ),
          updatingStockIds: (() => {
            const newSet = new Set(prev.updatingStockIds);
            newSet.delete(productId);
            return newSet;
          })()
        }));

        toast({
          title: "Stok Diperbarui",
          description: `Stok produk berhasil diubah menjadi ${newStock}`,
        });
      } else {
        throw new Error(response.error || 'Failed to update stock');
      }

    } catch (error) {
      errorService.handleServiceError('Update Stock', error, 'AdminPanel');
      // Remove from updating set on error
      setState(prev => {
        const newSet = new Set(prev.updatingStockIds);
        newSet.delete(productId);
        return { ...prev, updatingStockIds: newSet };
      });
    }
  }, [toast]);

  // Handle product delete
  const handleDeleteProduct = useCallback(async (productId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      return;
    }

    try {
      const response = await productService.deleteProduct(productId);

      if (response.success) {
        // Update local state
        setState(prev => ({
          ...prev,
          products: prev.products.filter(p => p.id !== productId)
        }));

        toast({
          title: "Produk Dihapus",
          description: "Produk berhasil dihapus",
        });
      } else {
        throw new Error(response.error || 'Failed to delete product');
      }

    } catch (error) {
      errorService.handleServiceError('Delete Product', error, 'AdminPanel');
    }
  }, [toast]);

  // Handle image selection
  const handleImageSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/')
    );

    // Create preview URLs
    const newUrls = imageFiles.map(file => URL.createObjectURL(file));

    setState(prev => ({
      ...prev,
      selectedImages: [...prev.selectedImages, ...imageFiles],
      imagePreviewUrls: [...prev.imagePreviewUrls, ...newUrls]
    }));
  }, []);

  // Remove selected image
  const removeSelectedImage = useCallback((index: number) => {
    setState(prev => {
      // Revoke the object URL to prevent memory leak
      if (prev.imagePreviewUrls[index]) {
        URL.revokeObjectURL(prev.imagePreviewUrls[index]);
      }

      return {
        ...prev,
        selectedImages: prev.selectedImages.filter((_, i) => i !== index),
        imagePreviewUrls: prev.imagePreviewUrls.filter((_, i) => i !== index)
      };
    });
  }, []);

  // Start editing product
  const startEditing = useCallback((product: Product) => {
    setState(prev => ({
      ...prev,
      editingProduct: product,
      showProductForm: true,
      selectedImages: []
    }));
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setState(prev => {
      // Cleanup all preview URLs
      prev.imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));

      return {
        ...prev,
        editingProduct: null,
        showProductForm: false,
        selectedImages: [],
        imagePreviewUrls: []
      };
    });
  }, []);

  // Render connection status
  const renderConnectionStatus = () => {
    const statusConfig = {
      connected: {
        icon: CheckCircle,
        color: 'text-green-500',
        text: 'Terhubung ke Database'
      },
      disconnected: {
        icon: AlertCircle,
        color: 'text-red-500',
        text: 'Mode Offline'
      },
      checking: {
        icon: RefreshCw,
        color: 'text-yellow-500',
        text: 'Memeriksa Koneksi...'
      }
    };

    const config = statusConfig[state.connectionStatus];
    const Icon = config.icon;

    return (
      <div className="flex items-center space-x-2">
        <Icon className={`h-4 w-4 ${config.color} ${state.connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
        <span className={`text-sm ${config.color}`}>{config.text}</span>
      </div>
    );
  };

  // Render product form
  const renderProductForm = () => {
    if (!state.showProductForm) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {state.editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
          </CardTitle>
          <CardDescription>
            {state.editingProduct ? 'Ubah informasi produk' : 'Tambahkan produk baru ke katalog'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            product={state.editingProduct}
            selectedImages={state.selectedImages}
            onSave={handleSaveProduct}
            onCancel={cancelEditing}
            onImageSelect={handleImageSelect}
            onRemoveImage={removeSelectedImage}
            isLoading={state.isLoading}
          />
        </CardContent>
      </Card>
    );
  };

  // Render products table
  const renderProductsTable = () => {
    if (state.isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      );
    }

    if (state.products.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada produk. Klik "Tambah Produk" untuk memulai.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gambar</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Harga</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{product.category}</Badge>
              </TableCell>
              <TableCell>{formatIDR(product.priceIdr)}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStockUpdate(product.id, product.stock - 1)}
                    disabled={product.stock <= 0 || state.updatingStockIds.has(product.id)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center">
                    {state.updatingStockIds.has(product.id) ? '...' : product.stock}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStockUpdate(product.id, product.stock + 1)}
                    disabled={state.updatingStockIds.has(product.id)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={product.isActive ? 'default' : 'secondary'}>
                  {product.isActive ? 'Aktif' : 'Tidak Aktif'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(product)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Kelola produk dan pesanan</p>
        </div>
        <div className="flex items-center space-x-4">
          {renderConnectionStatus()}
          <Button onClick={loadData} disabled={state.isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${state.isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Product Form */}
      {renderProductForm()}

      {/* Main Content */}
      <Tabs value={state.activeTab} onValueChange={(value) => setState(prev => ({ ...prev, activeTab: value as any }))}>
        <TabsList>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            Produk ({state.products.length})
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Pesanan ({state.orders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Daftar Produk</h2>
            <Button onClick={() => setState(prev => ({ ...prev, showProductForm: true, editingProduct: null }))}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Produk
            </Button>
          </div>
          {renderProductsTable()}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <h2 className="text-lg font-semibold">Daftar Pesanan</h2>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Fitur pesanan sedang dalam pengembangan.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Product Form Component
interface ProductFormProps {
  product?: Product | null;
  selectedImages: File[];
  onSave: (data: any) => void;
  onCancel: () => void;
  onImageSelect: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
  isLoading: boolean;
}

function ProductForm({
  product,
  selectedImages,
  onSave,
  onCancel,
  onImageSelect,
  onRemoveImage,
  isLoading
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'Makanan',
    description: product?.description || '',
    priceIdr: product?.priceIdr || 0,
    stock: product?.stock || 0,
    isActive: product?.isActive !== false
  });

  // Update form data when product prop changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || 'Makanan',
        description: product.description || '',
        priceIdr: product.priceIdr || 0,
        stock: product.stock || 0,
        isActive: product.isActive !== false
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.name.trim()) {
      errorService.handleValidationError('name', formData.name, 'required', 'ProductForm');
      return;
    }

    if (formData.priceIdr <= 0) {
      errorService.handleValidationError('priceIdr', formData.priceIdr, 'must be greater than 0', 'ProductForm');
      return;
    }

    if (formData.stock < 0) {
      errorService.handleValidationError('stock', formData.stock, 'cannot be negative', 'ProductForm');
      return;
    }

    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nama Produk *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Masukkan nama produk"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Makanan">Makanan</SelectItem>
              <SelectItem value="Snack">Snack</SelectItem>
              <SelectItem value="Minuman">Minuman</SelectItem>
              <SelectItem value="Lainnya">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceIdr">Harga (IDR) *</Label>
          <Input
            id="priceIdr"
            type="number"
            value={formData.priceIdr}
            onChange={(e) => setFormData(prev => ({ ...prev, priceIdr: parseInt(e.target.value) || 0 }))}
            placeholder="Masukkan harga"
            min="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stock">Stok</Label>
          <Input
            id="stock"
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
            placeholder="Masukkan stok"
            min="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Masukkan deskripsi produk"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Gambar Produk</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4">
              <Label htmlFor="images" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-muted-foreground">
                  Klik untuk memilih gambar
                </span>
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => onImageSelect(e.target.files)}
                  className="hidden"
                />
              </Label>
            </div>
          </div>
        </div>

        {/* Selected Images Preview */}
        {selectedImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {selectedImages.map((file, index) => (
              <ImagePreview
                key={index}
                file={file}
                index={index}
                onRemove={onRemoveImage}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Menyimpan...' : (product ? 'Update' : 'Simpan')}
        </Button>
      </div>
    </form>
  );
}

// ImagePreview Component
interface ImagePreviewProps {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}

function ImagePreview({ file, index, onRemove }: ImagePreviewProps) {
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <div className="relative group">
      <img
        src={preview}
        alt={file.name}
        className="w-full h-24 object-cover rounded border"
      />
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(index)}
      >
        <X className="h-3 w-3" />
      </Button>
      <p className="text-xs text-muted-foreground mt-1 truncate">{file.name}</p>
    </div>
  );
}