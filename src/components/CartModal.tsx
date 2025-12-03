import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatIDR } from '@/utils/currency';
import { Button } from '@/components/ui/button';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export function CartModal({ isOpen, onClose, onCheckout }: CartModalProps) {
  const { items: cart, updateQuantity, removeItem, totalPrice } = useCart();

  if (!isOpen) return null;

  const handleCheckout = () => {
    onCheckout();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="bg-card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md sm:max-h-[80vh] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center space-x-2">
            <ShoppingBag size={24} />
            <span>Keranjang</span>
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Keranjang kosong</p>
              <p className="text-sm text-muted-foreground mt-1">Tambahkan produk untuk mulai berbelanja</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 bg-accent/50 rounded-xl p-3">
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="w-12 h-12 object-cover rounded-lg"
                />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{item.product.name}</h3>
                  <p className="text-sm text-primary font-semibold">{formatIDR(item.product.priceIdr)}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-8 h-8 p-0 rounded-full"
                  >
                    <Minus size={14} />
                  </Button>
                  
                  <span className="min-w-[2rem] text-center font-semibold">{item.quantity}</span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-8 h-8 p-0 rounded-full"
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-foreground">Total:</span>
              <span className="text-xl font-bold text-primary">{formatIDR(totalPrice)}</span>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Lanjut Belanja
              </Button>
              <Button
                onClick={handleCheckout}
                className="flex-1 bg-primary hover:bg-primary-hover"
              >
                Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}