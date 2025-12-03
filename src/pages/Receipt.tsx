import { useParams, useNavigate } from 'react-router-dom';
import { ReceiptScreen } from '@/components/ReceiptScreen';
import { Header } from '@/components/Header';

const Receipt = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/');
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
        <ReceiptScreen 
          orderId={orderId} 
          onBackToHome={handleBackToHome}
        />
      </main>
    </div>
  );
};

export default Receipt;