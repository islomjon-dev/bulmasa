export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface Brand {
  id: string;
  userId: string;
  name: string;
  logo: string | null;
  primaryColor: string;
  textColor: string;
  fontSize: number;
  footerText: string;
  address: string;
  phone: string;
  qrContent: 'receipt_id' | 'public_link';
  defaultTemplate: 'classic' | 'modern' | 'minimal';
  createdAt: string;
}

export interface Product {
  id: string;
  brandId: string;
  userId: string;
  name: string;
  price: number;
  image: string | null;
  barcode: string | null;
  sku: string | null;
  category: string | null;
  unit: string | null;
  archived: boolean;
  createdAt: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PaymentDetails {
  type: 'cash' | 'card' | 'mixed';
  cashAmount: number;
  cardAmount: number;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  brandId: string;
  userId: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment: PaymentDetails;
  brandSnapshot: {
    name: string;
    logo: string | null;
    primaryColor: string;
    textColor: string;
    footerText: string;
    address: string;
    phone: string;
  };
  template: 'classic' | 'modern' | 'minimal';
  cancelled: boolean;
  createdAt: string;
}

export type Language = 'uz' | 'ru' | 'en';
export type Theme = 'light' | 'dark';

export interface AppSettings {
  language: Language;
  theme: Theme;
  activeBrandId: string | null;
}
