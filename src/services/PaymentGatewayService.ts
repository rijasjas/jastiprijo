/**
 * Payment Gateway Service - Simple QR Payment with WhatsApp
 * 100% FREE - No API keys needed!
 * Generates QR codes with payment information
 */

import { BaseService, ServiceResponse } from './BaseService';

export interface QRPaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
}

export interface QRPaymentResponse {
  qrCodeUrl: string;
  transactionId: string;
  expiresAt: string;
  provider: 'midtrans' | 'xendit' | 'static';
}

export interface PaymentStatusResponse {
  status: 'pending' | 'paid' | 'expired' | 'failed';
  paidAt?: string;
  amount?: number;
  paymentMethod?: string;
}

export class PaymentGatewayService extends BaseService {
  private adminWhatsApp: string;

  constructor() {
    super({
      retries: 3,
      timeout: 15000,
    });

    // Get admin WhatsApp from environment
    this.adminWhatsApp = import.meta.env.VITE_ADMIN_WA || '+6285924008884';
    console.log('✅ Payment Gateway ready - Free QR Payment Mode');
  }

  /**
   * Generate QR code for payment with WhatsApp link
   * 100% FREE - No payment gateway needed!
   */
  async generateQRPayment(request: QRPaymentRequest): Promise<ServiceResponse<QRPaymentResponse>> {
    return this.execute(
      async () => {
        console.log(`🔄 Generating payment QR for order ${request.orderId}...`);
        return this.generatePaymentLinkQR(request);
      },
      async () => {
        console.log('🔄 Fallback: Generating payment QR...');
        return this.generatePaymentLinkQR(request);
      },
      'Generate QR Payment'
    );
  }

  /**
   * Generate Payment Link QR Code
   * Creates QR with WhatsApp link for easy payment confirmation
   */
  private generatePaymentLinkQR(request: QRPaymentRequest): QRPaymentResponse {
    console.log('🔄 Generating Payment Link QR...');

    // Format amount in Indonesian Rupiah
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(request.amount);

    // Create WhatsApp message with payment details
    const message = `Halo Admin JastipRijo!\n\n` +
      `Saya ingin konfirmasi pembayaran:\n` +
      `📝 Order ID: ${request.orderId}\n` +
      `💰 Total: ${formattedAmount}\n` +
      `👤 Nama: ${request.customerName}\n\n` +
      `Saya akan segera transfer dan mengirim bukti pembayaran.\n\n` +
      `Terima kasih! 🙏`;

    // Create WhatsApp link
    const whatsappNumber = this.adminWhatsApp.replace('+', '').replace(/\s/g, '');
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    // Create payment info for QR code
    const paymentInfo = {
      type: 'JASTIP_PAYMENT',
      orderId: request.orderId,
      amount: request.amount,
      formattedAmount: formattedAmount,
      customerName: request.customerName,
      whatsappLink: whatsappLink,
      bankDetails: {
        bank: 'BLU by BCA Digital',
        accountNumber: '009639772895',
        accountName: 'Richard Yonathan Julio Clay',
      },
      instructions: [
        '1. Scan QR ini atau klik link',
        '2. Transfer ke rekening yang tertera',
        '3. Hubungi admin via WhatsApp',
        '4. Kirim bukti pembayaran',
      ],
      timestamp: new Date().toISOString(),
    };

    // For QR code, we'll use the WhatsApp link
    // When user scans, it opens WhatsApp directly!
    const qrData = whatsappLink;

    console.log('✅ Payment Link QR generated with WhatsApp integration');

    return {
      qrCodeUrl: qrData,
      transactionId: `wa-${request.orderId}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      provider: 'static',
    };
  }

  /**
   * Check payment status
   * For manual payment, always returns pending until admin verifies
   */
  async checkPaymentStatus(transactionId: string, provider: string): Promise<ServiceResponse<PaymentStatusResponse>> {
    return this.execute(
      async () => {
        console.log(`🔄 Checking payment status for ${transactionId}...`);
        
        // Manual payment - status checked by admin
        return {
          status: 'pending',
        };
      },
      async () => {
        return { status: 'pending' };
      },
      'Check Payment Status'
    );
  }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService();

/**
 * Helper function to create WhatsApp payment link
 */
export function createWhatsAppPaymentLink(
  orderId: string,
  amount: number,
  customerName: string,
  adminWhatsApp: string = '+6285924008884'
): string {
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

  const message = `Halo Admin JastipRijo!\n\n` +
    `Saya ingin konfirmasi pembayaran:\n` +
    `📝 Order ID: ${orderId}\n` +
    `💰 Total: ${formattedAmount}\n` +
    `👤 Nama: ${customerName}\n\n` +
    `Saya akan segera transfer dan mengirim bukti pembayaran.\n\n` +
    `Terima kasih! 🙏`;

  const whatsappNumber = adminWhatsApp.replace('+', '').replace(/\s/g, '');
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
