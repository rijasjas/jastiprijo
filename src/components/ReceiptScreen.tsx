
import { useState, useEffect } from 'react';
import { Download, MessageCircle, Home } from 'lucide-react';
import { getOrderById } from '@/utils/supabase';
import { formatIDR } from '@/utils/currency';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Use dynamic import for jsPDF and html2canvas to avoid loading them on initial render
let jsPDFModule: any;
let html2canvasModule: any;

// Lazy load modules only when needed
const loadModules = async () => {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  if (!html2canvasModule) {
    html2canvasModule = await import('html2canvas');
  }
  return { jsPDF: jsPDFModule.default, html2canvas: html2canvasModule.default };
};

interface ReceiptScreenProps {
  orderId: string;
  onBackToHome: () => void;
}

export function ReceiptScreen({ orderId, onBackToHome }: ReceiptScreenProps) {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    // Try Supabase first
    try {
      const orderData = await getOrderById(orderId);
      if (orderData) {
        setOrder(orderData);
        return;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch order from Supabase, checking localStorage');
    }

    // Try offline orders from CheckoutForm
    try {
      const offlineOrders = JSON.parse(localStorage.getItem('jastiprijo_offline_orders') || '[]');
      const offlineOrder = offlineOrders.find((o: any) => o.id === orderId);

      if (offlineOrder) {
        console.log('✅ Found order in offline storage');
        setOrder(offlineOrder);
        return;
      }
    } catch (error) {
      console.error('Error loading offline orders:', error);
    }

    // No order found
    console.error('Order not found in Supabase or localStorage');
    setOrder(null);
  };
  const { toast } = useToast();

  const generatePdf = async () => {
    if (!order) return;
    const { jsPDF } = await loadModules();
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

  if (!order) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <p className="text-destructive">Pesanan tidak ditemukan</p>
      </div>
    );
  }

  const adminPhoneNumber = '+6285924008884';

  const handleDownloadReceipt = () => {
    // Simple print-to-PDF functionality
    window.print();
  };

  const handleSendToWhatsApp = async () => {
    // Generate PDF first
    const pdfDoc = await generatePdf();
    if (!pdfDoc) return;

    // Create simplified WhatsApp message without transfer details
    const itemsList = order.items.map(item =>
      `• ${item.nameSnapshot} (${item.quantity}x) - ${formatIDR(item.lineTotalIdr)}`
    ).join('\n');

    const statusText = order.status === 'PENDING_PROOF' ? 'Menunggu Bukti Pembayaran' :
      order.status === 'PROOF_RECEIVED' ? 'Bukti Diterima, Sedang Diverifikasi' :
        order.status === 'VERIFIED' ? 'Pembayaran Terverifikasi' :
          order.status === 'PREPARING' ? 'Sedang Disiapkan' :
            order.status === 'COMPLETED' ? 'Selesai' :
              order.status === 'REJECTED' ? 'Ditolak' : 'Status Tidak Dikenal';

    const orderDate = new Date(order.createdAt).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = encodeURIComponent(
      `🧾 *STRUK PESANAN JASTIP RIJO*\n\n` +
      `📋 *Detail Pesanan:*\n` +
      `Order ID: ${order.id}\n` +
      `Tanggal: ${orderDate}\n` +
      `Status: ${statusText}\n\n` +
      `👤 *Data Pemesan:*\n` +
      `Nama: ${order.customerName}\n` +
      `HP: ${order.customerPhone}\n\n` +
      `🛒 *Item Pesanan:*\n${itemsList}\n\n` +
      `💰 *Total Pembayaran: ${formatIDR(order.subtotalIdr)}*\n\n` +
      `${order.paymentProof ? '✅ Bukti pembayaran sudah dikirim' : '⏳ Menunggu bukti pembayaran'}\n\n` +
      // `📎 *PDF terlampir*\n\n` +
      `Terima kasih telah menggunakan layanan JastipRijo! 🙏`
    );

    const whatsappUrl = `https://wa.me/${adminPhoneNumber.replace('+', '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');

    // Auto-download PDF for user to attach
    pdfDoc.save(`receipt-${order.id}.pdf`);

    toast({
      title: "Membuka WhatsApp",
      description: "PDF telah diunduh. Silakan kirimkan file PDF ke Admin WhatsApp",
    });
  };

  const handleGeneratePdfAndOpenWA = () => {
    handleSendToWhatsApp();
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
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Selesai</span>;
      case 'REJECTED':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Ditolak</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {/* Receipt Card */}
      <div id="receipt" className="bg-card rounded-2xl p-6 border border-border">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">JastipRijo</h2>
          <p className="text-sm text-muted-foreground">Struk Pemesanan</p>
        </div>

        {/* Order Info */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Order ID:</span>
            <span className="font-mono font-bold">{order.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tanggal:</span>
            <span>{new Date(order.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Status:</span>
            <span>{getStatusBadge(order.status)}</span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="border-t border-border pt-4 mb-4">
          <h3 className="font-semibold text-foreground mb-2">Data Pemesan</h3>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Nama:</span> {order.customerName}</p>
            <p><span className="font-medium">HP:</span> {order.customerPhone}</p>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-border pt-4 mb-4">
          <h3 className="font-semibold text-foreground mb-3">Detail Pesanan</h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="flex-1">
                  <span className="block">{item.nameSnapshot}</span>
                  <span className="text-muted-foreground">{item.quantity} × {formatIDR(item.priceSnapshotIdr)}</span>
                </div>
                <span className="font-medium">{formatIDR(item.lineTotalIdr)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-border pt-4 mb-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary">{formatIDR(order.subtotalIdr)}</span>
          </div>
        </div>

        {/* Payment Proof */}
        {order.paymentProof && (
          <div className="border-t border-border pt-4">
            <h4 className="font-semibold text-foreground mb-2">Bukti Pembayaran:</h4>
            <img
              src={order.paymentProof.fileUrl}
              alt="Bukti pembayaran"
              className="w-full rounded-xl border border-border max-h-32 object-contain"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleDownloadReceipt}
          className="w-full bg-primary hover:bg-primary-hover"
        >
          <Download size={20} className="mr-2" />
          Download PDF
        </Button>

        <Button
          onClick={handleSendToWhatsApp}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <MessageCircle size={20} className="mr-2" />
          Kirim ke WhatsApp + PDF
        </Button>

        <Button
          onClick={onBackToHome}
          variant="outline"
          className="w-full"
        >
          <Home size={20} className="mr-2" />
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
}
