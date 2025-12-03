import { memo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { formatIDR } from '@/utils/currency';
import { useCart } from '@/contexts/CartContext';
import { Plus, Minus, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  
  const quantity = getItemQuantity(product.id);
  const isOutOfStock = product.stock === 0;



  const handleAddToCart = () => {
    if (!isOutOfStock) {
      addItem(product);
    }
  };

  const handleIncreaseQuantity = () => {
    if (!isOutOfStock && quantity < product.stock) {
      updateQuantity(product.id, quantity + 1);
    }
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
    } else if (quantity === 1) {
      updateQuantity(product.id, 0); // Remove from cart
    }
  };

  // Get primary image efficiently
  const getImageSrc = () => {
    if (product.images?.length > 0) {
      const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
      if (primaryImage?.imageUrl && primaryImage.imageUrl !== '/placeholder.svg') {
        return primaryImage.imageUrl;
      }
    }
    return product.imageUrl || '/placeholder.svg';
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Image Container - Simplified */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={getImageSrc()}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Stock Badge */}
          <div className="absolute top-2 right-2">
            <Badge 
              variant={isOutOfStock ? "destructive" : "default"}
              className="text-xs"
            >
              {isOutOfStock ? 'Habis' : `${product.stock}`}
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 space-y-2">
        <div className="w-full space-y-2">
          {/* Product Name */}
          <h3 className="font-semibold text-sm line-clamp-2">
            {product.name}
          </h3>
          
          {/* Price */}
          <div className="text-base font-bold text-primary">
            {formatIDR(product.priceIdr)}
          </div>
          
          {/* Cart Controls */}
          <div className="flex items-center justify-between">
            {quantity === 0 ? (
              // Add to cart button
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex items-center justify-center space-x-1 w-full text-sm"
              >
                <ShoppingCart size={14} />
                <span>Tambah</span>
              </Button>
            ) : (
              // Quantity controls
              <div className="flex items-center space-x-2 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDecreaseQuantity}
                  className="w-8 h-8 p-0"
                >
                  <Minus size={14} />
                </Button>
                
                <span className="flex-1 text-center text-sm font-semibold">
                  {quantity}
                </span>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleIncreaseQuantity}
                  disabled={quantity >= product.stock}
                  className="w-8 h-8 p-0"
                >
                  <Plus size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
});