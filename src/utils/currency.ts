
/**
 * Format IDR currency with proper Indonesian formatting
 * No decimals for whole prices
 */
export const formatCurrency = (amount: number): string => {
  try {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return 'Rp 0';
    }
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `Rp ${amount?.toLocaleString() || '0'}`;
  }
};

export const formatIDR = (amount: number): string => {
  return formatCurrency(amount);
};

/**
 * Parse IDR string back to number
 */
export function parseIDR(idrString: string): number {
  return parseInt(idrString.replace(/[^\d]/g, ''), 10) || 0;
}

/**
 * Format phone number for Indonesian numbers
 */
export function formatPhoneNumber(phone: string): string {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Add +62 prefix if not present and starts with 8
  if (digits.startsWith('8')) {
    return `+62${digits}`;
  }
  
  // Add + if starts with 62
  if (digits.startsWith('62')) {
    return `+${digits}`;
  }
  
  return phone;
}

/**
 * Validate Indonesian phone number - More flexible validation
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || phone.trim() === '') {
    return false;
  }
  
  const digits = phone.replace(/\D/g, '');
  
  // More flexible validation for Indonesian phone numbers:
  // - Must be at least 10 digits
  // - Can start with 08, 62, or +62
  // - Maximum 15 digits
  
  if (digits.length < 10 || digits.length > 15) {
    return false;
  }
  
  // Check if starts with 08 (local format)
  if (digits.startsWith('08')) {
    return true;
  }
  
  // Check if starts with 62 (international format)
  if (digits.startsWith('62')) {
    return true;
  }
  
  // Check if starts with 8 (without 0 prefix)
  if (digits.startsWith('8')) {
    return true;
  }
  
  // Allow any 10+ digit number as fallback
  return digits.length >= 10;
}
