/**
 * QR Payment Display Component
 * Shows QR code with WhatsApp link for easy payment
 * 100% FREE - No payment gateway needed!
 */

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, Clock, XCircle, RefreshCw, Smartphone, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatIDR } from '@/utils/currency';
import { paymentGatewayService, QRPaymentResponse, PaymentStatusResponse } from '@/services/PaymentGatewayService';

interface QRPaymentDisplayProps {
  orderId: string;
  amount: number;
  customerName: string;
  onPaymentSuccess: () => void;
}

export function QRPaymentDisplay({ orderId, amount, customerName, onPaymentSuccess }: QRPaymentDisplayProps) {
  const [qrData, setQrData] = useState<QRPaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResponse['status']>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Generate QR code on mount
  const generateQR = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await paymentGatewayService.generateQRPayment({
        orderId,
        amount,
        customerName,
        customerPhone: '', // Can be added if needed
      });

      if (response.success && response.data) {
        setQrData(response.data);
        console.log('✅ QR code generated:', response.data);
      } else {
        throw new Error(response.error || 'Failed to generate QR code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      console.error('❌ QR generation error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, amount, customerName]); // Added all dependencies

  // Call generateQR on mount or when dependencies change
  useEffect(() => {
    generateQR();
  }, [generateQR]);

  const handleOpenWhatsApp = () => {
    if (qrData?.qrCodeUrl) {
      window.open(qrData.qrCodeUrl, '_blank');
    }
  };

  const handleCopyBankDetails = async () => {
    const bankDetails = `Bank: BLU by BCA Digital\nNo. Rekening: 009639772895\nAtas Nama: Richard Yonathan Julio Clay\nJumlah: ${formatIDR(amount)}`;

    try {
      await navigator.clipboard.writeText(bankDetails);
      alert('✅ Detail rekening berhasil disalin!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = () => {
    switch (paymentStatus) {
      case 'paid':
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-500" />,
          title: 'Pembayaran Berhasil!',
          message: 'Terima kasih, pembayaran Anda telah kami terima.',
          color: 'bg-green-50 border-green-200',
        };
      case 'expired':
        return {
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          title: 'QR Code Kadaluarsa',
          message: 'QR code telah kadaluarsa. Silakan generate ulang.',
          color: 'bg-red-50 border-red-200',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          title: 'Pembayaran Gagal',
          message: 'Pembayaran tidak dapat diproses. Silakan coba lagi.',
          color: 'bg-red-50 border-red-200',
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Generating QR code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
          <Button onClick={generateQR} variant="outline" size="sm" className="mt-2 w-full">
            Coba Lagi
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!qrData) return null;

  // Show success/failure status
  if (statusDisplay) {
    return (
      <div className={`rounded-2xl p-8 border-2 ${statusDisplay.color}`}>
        <div className="flex flex-col items-center space-y-4">
          {statusDisplay.icon}
          <h3 className="text-xl font-bold">{statusDisplay.title}</h3>
          <p className="text-center text-muted-foreground">{statusDisplay.message}</p>
          {paymentStatus === 'expired' && (
            <Button onClick={generateQR} className="mt-4">
              Generate QR Baru
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show QR code for payment
  return (
    <div className="space-y-6">
      {/* Payment Amount */}
      <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20 text-center">
        <p className="text-sm text-muted-foreground mb-1">Total Pembayaran</p>
        <p className="text-3xl font-bold text-primary">{formatIDR(amount)}</p>
      </div>

      {/* QR Code Display */}
      <div className="bg-white rounded-2xl p-6 border-2 border-border">
        <div className="flex flex-col items-center space-y-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
            <QRCodeSVG
              value={qrData.qrCodeUrl}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* WhatsApp Button */}
          <Button
            onClick={handleOpenWhatsApp}
            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center space-x-2"
            size="lg"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Buka WhatsApp Admin</span>
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            💡 Scan QR code atau klik tombol untuk hubungi admin
          </p>

          {/* Timer */}
          {timeRemaining > 0 && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Berlaku: <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="font-bold text-foreground mb-3">Detail Rekening:</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bank:</span>
            <span className="font-semibold">BLU by BCA Digital</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">No. Rekening:</span>
            <span className="font-mono font-bold">009639772895</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Atas Nama:</span>
            <span className="font-semibold">Richard Yonathan</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jumlah:</span>
            <span className="font-bold text-primary">{formatIDR(amount)}</span>
          </div>
        </div>
        <Button
          onClick={handleCopyBankDetails}
          variant="outline"
          size="sm"
          className="w-full mt-3"
        >
          Salin Detail Rekening
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="font-bold text-foreground mb-3 flex items-center space-x-2">
          <Smartphone className="w-5 h-5" />
          <span>Cara Pembayaran:</span>
        </h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li><strong>Scan QR code</strong> atau klik tombol WhatsApp</li>
          <li><strong>Transfer</strong> ke rekening yang tertera</li>
          <li><strong>Hubungi admin</strong> via WhatsApp</li>
          <li><strong>Kirim bukti</strong> pembayaran ke admin</li>
          <li><strong>Tunggu konfirmasi</strong> dari admin</li>
        </ol>

        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-700">
            💬 <strong>WhatsApp Auto-Message:</strong> QR code ini akan langsung membuka WhatsApp
            dengan pesan yang sudah disiapkan. Anda tinggal klik kirim!
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm text-blue-700">
          ✅ <strong>100% GRATIS!</strong> Sistem pembayaran ini tidak menggunakan payment gateway berbayar.
          Pembayaran dikonfirmasi langsung oleh admin setelah Anda mengirim bukti transfer.
        </p>
      </div>
    </div>
  );
}
