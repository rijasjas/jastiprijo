import { useNavigate } from 'react-router-dom';
import { CheckoutForm } from '@/components/CheckoutForm';
import { Header } from '@/components/Header';

const Checkout = () => {
  const navigate = useNavigate();

  const handleOrderCreated = (orderId: string) => {
    navigate(`/payment/${orderId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        <CheckoutForm onOrderCreated={handleOrderCreated} />
      </main>
    </div>
  );
};

export default Checkout;