/**
 * Bank Configuration
 * Centralized bank account details for payment
 */

export const BANK_CONFIG = {
  bank: 'BLU by BCA Digital',
  accountNumber: '009639772895',
  accountName: 'Richard Yonathan Julio Clay',
} as const;

export type BankConfig = typeof BANK_CONFIG;
