import { useState, useRef, useEffect } from 'react';
import { Copy, Upload, CheckCircle, ArrowLeft, MessageCircle, QrCode, CreditCard } from 'lucide-react';
import { getOrderById as getOrderByIdFromSupabase, addPaymentProof } from '@/utils/supabase';
import { getOrderById as getOrderByIdFromLocal, saveOrder as saveOrderLocal } from '@/utils/storage';
import { formatIDR } from '@/utils/currency';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { QRPaymentDisplay } from '@/components/QRPaymentDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PaymentScreenProps {
  orderId: string;
  onPaymentProofUploaded: () => void;
}

export function PaymentScreen({ orderId, onPaymentProofUploaded }: PaymentScreenProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'qr' | 'manual'>('qr');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Constants
  const adminPhoneNumber = (import.meta.env.VITE_ADMIN_WA as string) || '+6285924008884';
  const bankInfo = {
    bank: 'BLU by BCA Digital',
    accountNumber: '009639772895',
    accountName: 'Richard Yonathan Julio Clay',
  };

  useEffect(() => {
    const load = async () => {
      // Try Supabase first
      try {
        const fromDb = await getOrderByIdFromSupabase(orderId);
        if (fromDb) {
          setOrder(fromDb);
          return;
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch order from Supabase, checking localStorage');
      }

      // Try offline orders from CheckoutForm
      const offlineOrders = JSON.parse(localStorage.getItem('jastiprijo_offline_orders') || '[]');
      const offlineOrder = offlineOrders.find((o: any) => o.id === orderId);

      if (offlineOrder) {
        console.log('✅ Found order in offline storage');
        setOrder(offlineOrder);
        return;
      }

      // Fallback to old local storage format
      const fromLocal = getOrderByIdFromLocal(orderId);
      setOrder(fromLocal || null);
    };
    load();
  }, [orderId]);

  if (!order) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <p className="text-destructive">Pesanan tidak ditemukan</p>
      </div>
    );
  }

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(bankInfo.accountNumber);
      toast({
        title: "Tersalin!",
        description: "Nomor rekening berhasil disalin",
      });
    } catch (error) {
      toast({
        title: "Gagal menyalin",
        description: "Silakan salin manual",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Format file tidak valid",
        description: "Gunakan format JPG, PNG, atau WEBP",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File terlalu besar",
        description: "Maksimal ukuran file 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileUrl = reader.result as string;

        try {
          // Try to save to Supabase first
          const proof = await addPaymentProof(orderId, fileUrl);
          const updatedOrder: Order = { ...order, status: 'PROOF_RECEIVED', paymentProof: proof };
          setOrder(updatedOrder);
        } catch (e) {
          // Fallback: save locally
          const updatedOrder: Order = { ...order, status: 'PROOF_RECEIVED', paymentProof: { id: `proof-${orderId}`, orderId, fileUrl, uploadedAt: new Date().toISOString() } };
          saveOrderLocal(updatedOrder);
          setOrder(updatedOrder);
        }

        toast({
          title: "Bukti pembayaran berhasil diunggah",
          description: "Pesanan Anda sedang diverifikasi",
        });

        onPaymentProofUploaded();
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Gagal mengunggah file",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleContactAdmin = () => {
    const message = encodeURIComponent('Halo Admin, saya memiliki kendala dalam proses pembayaran');
    const whatsappUrl = `https://wa.me/${String(adminPhoneNumber).replace('+', '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Pembayaran Berhasil!",
      description: "Terima kasih, pembayaran Anda telah kami terima.",
    });
    onPaymentProofUploaded();
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Back Button */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Produk</span>
        </Button>
      </div>

      {/* Order Info */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h2 className="text-xl font-bold text-foreground mb-4">Pembayaran</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Order ID:</span>
            <span className="font-mono font-bold">{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Total:</span>
            <span className="font-bold text-primary">{formatIDR(order.subtotalIdr)}</span>
          </div>
        </div>
      </div>

      {/* Payment Method Tabs */}
      <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'qr' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qr" className="flex items-center space-x-2">
            <QrCode size={16} />
            <span>QR Payment</span>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center space-x-2">
            <CreditCard size={16} />
            <span>Transfer Manual</span>
          </TabsTrigger>
        </TabsList>

        {/* QR Payment Tab */}
        <TabsContent value="qr" className="mt-6">
          <QRPaymentDisplay
            orderId={order.id}
            amount={order.subtotalIdr}
            customerName={order.customerName}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </TabsContent>

        {/* Manual Transfer Tab */}
        <TabsContent value="manual" className="mt-6 space-y-6">
          {/* Bank Details */}
          <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
            <h3 className="font-bold text-foreground mb-4">Transfer ke:</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Bank:</span>
                <p className="font-semibold">{bankInfo.bank}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Nomor Rekening:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-lg">{bankInfo.accountNumber}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAccountNumber}
                    className="p-2 h-8"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Atas Nama:</span>
                <p className="font-semibold select-none" style={{ userSelect: 'none' }} onContextMenu={(e) => e.preventDefault()}>
                  {bankInfo.accountName}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="font-bold text-foreground mb-4">Upload Bukti Pembayaran</h3>
            {order.paymentProof ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle size={20} />
                  <span className="font-medium">Bukti pembayaran telah diunggah</span>
                </div>
                <img
                  src={order.paymentProof.fileUrl}
                  alt="Bukti pembayaran"
                  className="w-full rounded-xl border border-border max-h-48 object-contain"
                />
                <p className="text-sm text-muted-foreground">
                  Diunggah pada: {new Date(order.paymentProof.uploadedAt).toLocaleString('id-ID')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Upload screenshot bukti transfer Anda (JPG, PNG, atau WEBP, maks. 10MB)
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Upload size={48} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isUploading ? 'Mengunggah...' : 'Klik untuk memilih file'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Contact Admin Button */}
          <div className="bg-card rounded-2xl p-4 border border-border">
            <Button
              onClick={handleContactAdmin}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              <MessageCircle size={16} />
              <span>Hubungi Admin</span>
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Klik untuk menghubungi admin via WhatsApp jika ada kendala
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}