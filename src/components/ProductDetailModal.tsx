import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { formatIDR } from '@/utils/currency';
import { Button } from '@/components/ui/button';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const currentQuantity = product ? getItemQuantity(product.id) : 0;
  const isOutOfStock = product?.stock === 0;
  const isLowStock = product && product.stock < 5 && product.stock > 0;

  // Get all unique images for the product (prevent duplication)
  const allImages = product ? [
    product.imageUrl,
    ...(product.images?.filter(img => img.imageUrl !== product.imageUrl).map(img => img.imageUrl) || [])
  ].filter(Boolean) : [];

  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
      setImageError(false);
      setIsZoomed(false);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [isOpen, product]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (isZoomed) {
            setPanPosition(prev => ({ ...prev, x: prev.x + 30 }));
          } else {
            handlePreviousImage();
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (isZoomed) {
            setPanPosition(prev => ({ ...prev, x: prev.x - 30 }));
          } else {
            handleNextImage();
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (isZoomed) {
            setPanPosition(prev => ({ ...prev, y: prev.y + 30 }));
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (isZoomed) {
            setPanPosition(prev => ({ ...prev, y: prev.y - 30 }));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentImageIndex, allImages.length, onClose, isZoomed]);

  const handlePreviousImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex(prev => 
        prev === 0 ? allImages.length - 1 : prev - 1
      );
      resetZoom();
    }
  };

  const handleNextImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex(prev => 
        prev === allImages.length - 1 ? 0 : prev + 1
      );
      resetZoom();
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2.5));
    setIsZoomed(true);
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
    if (zoomLevel <= 1.2) {
      setIsZoomed(false);
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setIsZoomed(false);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isZoomed) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && isZoomed) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomed && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - panPosition.x, 
        y: e.touches[0].clientY - panPosition.y 
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && isZoomed && e.touches.length === 1) {
      // e.preventDefault(); // Coba nonaktifkan baris ini jika menyebabkan masalah scroll di mobile
      setPanPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDecrease = () => {
    if (product && currentQuantity > 0) {
      updateQuantity(product.id, currentQuantity - 1);
    }
  };

  const handleIncrease = () => {
    if (product && currentQuantity < product.stock) {
      if (currentQuantity === 0) {
        addItem(product, 1);
      } else {
        updateQuantity(product.id, currentQuantity + 1);
      }
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
      {/* Main Modal Container - Medium size and centered */}
      <div className="relative w-full max-w-4xl h-full max-h-[85vh] flex flex-col lg:flex-row bg-white rounded-xl overflow-hidden shadow-2xl">
        {/* Close Button - Positioned on the modal itself */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-colors"
          aria-label="Close"
        >
          <X size={16} className="sm:w-4 sm:h-4" />
        </button>

        {/* Back Button - Positioned on the modal itself */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-colors flex items-center gap-1 sm:gap-2"
        >
          <ChevronLeft size={14} className="sm:w-3.5 sm:h-3.5" />
          <span className="text-xs sm:text-sm hidden sm:inline">Kembali</span>
        </button>

        {/* Zoom Controls - Positioned on the modal itself */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 flex gap-1 sm:gap-2">
          <button
            onClick={handleZoomIn}
            className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1 sm:p-1.5 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1 sm:p-1.5 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1 sm:p-1.5 transition-colors"
            aria-label="Reset zoom"
          >
            <RotateCcw size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>
        </div>

        {/* Image Section - Better responsive sizing */}
        <div className="flex-1 relative flex items-center justify-center min-h-0 bg-gray-900">
          {/* Previous Arrow */}
          {allImages.length > 1 && !isZoomed && (
            <button
              onClick={handlePreviousImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Main Image Container */}
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            {!imageError && allImages[currentImageIndex] ? (
              <img
                ref={imageRef}
                src={allImages[currentImageIndex]}
                alt={`${product.name} - Image ${currentImageIndex + 1}`}
                className={`transition-transform duration-200 ${
                  isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
                }`}
                style={{
                  transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                  maxWidth: isZoomed ? 'none' : '100%',
                  maxHeight: isZoomed ? 'none' : '100%',
                  objectFit: isZoomed ? 'none' : 'contain'
                }}
                onError={() => setImageError(true)}
                onDoubleClick={() => {
                  if (isZoomed) {
                    resetZoom();
                  } else {
                    handleZoomIn();
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <span className="text-white text-sm sm:text-base">No Image</span>
              </div>
            )}

            {/* Image Counter */}
            {allImages.length > 1 && !isZoomed && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                {currentImageIndex + 1} / {allImages.length}
              </div>
            )}
          </div>

          {/* Next Arrow */}
          {allImages.length > 1 && !isZoomed && (
            <button
              onClick={handleNextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 sm:p-2 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={14} className="sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Product Info Section - Optimized for mobile landscape */}
        <div className="w-full lg:w-80 xl:w-72 bg-white p-3 sm:p-4 lg:p-5 overflow-y-auto max-h-full">
          <div className="space-y-3 sm:space-y-4 lg:space-y-5">
            {/* Product Name */}
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 line-clamp-2">{product.name}</h1>

            {/* Stock Badge */}
            <div>
              {isOutOfStock ? (
                <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                  Habis
                </span>
              ) : isLowStock ? (
                <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  Sisa {product.stock}
                </span>
              ) : (
                <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Stok {product.stock}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 lg:line-clamp-4">{product.description}</p>

            {/* Price */}
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
              {formatIDR(product.priceIdr)}
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Jumlah:</span>
              <div className="flex items-center space-x-2">
                {currentQuantity > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDecrease}
                    className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 p-0 rounded-full"
                  >
                    <ChevronLeft size={12} className="sm:w-3.5 lg:w-4" />
                  </Button>
                )}

                {currentQuantity > 0 && (
                  <span className="min-w-[1.5rem] sm:min-w-[2rem] lg:min-w-[2.5rem] text-center font-semibold text-sm sm:text-base lg:text-lg">
                    {currentQuantity}
                  </span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleIncrease}
                  disabled={isOutOfStock || currentQuantity >= product.stock}
                  className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 p-0 rounded-full bg-primary text-primary-foreground border-primary hover:bg-primary-hover disabled:opacity-50 disabled:bg-muted"
                >
                  <ChevronRight size={12} className="sm:w-3.5 lg:w-4" />
                </Button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleIncrease}
              disabled={isOutOfStock}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:bg-muted text-sm"
            >
              {isOutOfStock ? 'Stok Habis' : 'Tambah ke Keranjang'}
            </Button>

            {/* Thumbnail Navigation */}
            {allImages.length > 1 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Galeri:</span>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {allImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentImageIndex(index);
                        resetZoom();
                      }}
                      className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === currentImageIndex
                          ? 'border-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
