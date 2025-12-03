import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { AdminLoginModal } from './AdminLoginModal';
import { useCart } from '@/contexts/CartContext';
import { formatIDR } from '@/utils/currency';

interface HeaderProps {
  onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const { totalItems, totalPrice } = useCart();

  return (
    <>
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAdminModal(true)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center hover:opacity-80 transition-opacity overflow-hidden"
              aria-label="Admin Login"
            >
              <img 
                src="/logoR.png" 
                alt="JastipRijo Logo" 
                className="w-full h-full object-contain"
                fetchPriority="high"
                loading="eager"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = '<span class="bg-primary text-primary-foreground font-bold text-lg">R</span>';
                }}
              />
            </button>
            <h1 className="text-xl font-bold text-foreground">JastipRijo</h1>
          </div>

          {/* Cart Button */}
          <button
            onClick={onCartClick}
            className="relative bg-primary text-primary-foreground px-4 py-2 rounded-2xl flex items-center space-x-2 hover:bg-primary-hover transition-colors shadow-sm"
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <>
                <span className="text-sm font-medium">{totalItems}</span>
                <span className="text-xs">•</span>
                <span className="text-sm font-medium">{formatIDR(totalPrice)}</span>
                {/* Badge */}
                <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                  {totalItems}
                </div>
              </>
            )}
            {totalItems === 0 && <span className="text-sm">Cart</span>}
          </button>
        </div>
      </header>

      <AdminLoginModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)} 
      />
    </>
  );
}