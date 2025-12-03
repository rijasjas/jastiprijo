import { useParams, useNavigate } from 'react-router-dom';
import { PaymentScreen } from '@/components/PaymentScreen';
import { Header } from '@/components/Header';

const Payment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const handlePaymentProofUploaded = () => {
    if (orderId) {
      navigate(`/receipt/${orderId}`);
    }
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Order ID tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-6">
        <PaymentScreen 
          orderId={orderId} 
          onPaymentProofUploaded={handlePaymentProofUploaded}
        />
      </main>
    </div>
  );
};

export default Payment;