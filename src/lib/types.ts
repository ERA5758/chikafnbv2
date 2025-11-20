

'use client';
import type { PointEarningSettings } from './point-earning-settings';

// Untuk menambah kategori produk baru, tambahkan nama kategori di dalam daftar di bawah ini.
// Pastikan untuk mengapitnya dengan tanda kutip tunggal (') dan menambahkan koma di akhir.
export const productCategories = [
  'Kopi',
  'Non-Kopi',
  'Makanan Utama',
  'Makanan Ringan',
  'Dessert',
  'Lainnya',
] as const;

export type ProductCategory = (typeof productCategories)[number];

export type { PointEarningSettings };

export type ReceiptSettings = {
    headerText: string;
    footerText: string;
    promoText: string;
    voiceGender: 'male' | 'female';
    notificationStyle: 'fakta' | 'pantun';
};

export type NotificationSettings = {
  dailySummaryEnabled: boolean;
};

export type FinancialSettings = {
  taxPercentage: number;
  serviceFeePercentage: number;
};

export type Store = {
  id: string;
  name: string;
  location: string;
  businessDescription?: string;
  receiptSettings?: ReceiptSettings;
  pointEarningSettings?: PointEarningSettings;
  notificationSettings?: NotificationSettings;
  financialSettings?: FinancialSettings;
  pradanaTokenBalance: number;
  adminUids: string[];
  createdAt: string;
  firstTransactionDate?: string | null;
  transactionCounter?: number;
  virtualTableCounter?: number;
  referralCode?: string;
  catalogSlug?: string;
  catalogSubscriptionExpiry?: string;
  hasUsedCatalogTrial?: boolean;
  theme?: any;
  socialLinks?: any;
  logoUrl?: string;
  description?: string;
  qrisImageUrl?: string;
};

export type UserRole = 'admin' | 'cashier' | 'superadmin' | 'kitchen';

export type User = {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  whatsapp?: string;
  status: 'active' | 'inactive';
  storeId?: string; // Optional: Cashiers are tied to one store
};

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  description?: string;
  stock: number;
  price: number;
  costPrice: number;
  supplierId: string;
  imageUrl: string;
  imageHint: string;
  attributes: {
    brand: string;
    barcode?: string;
    [key: string]: string | number | boolean | null;
  };
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD
  joinDate: string; // ISO 8601
  loyaltyPoints: number;
  memberTier: 'Bronze' | 'Silver' | 'Gold';
  avatarUrl: string;
};

export type TransactionStatus = 'Diproses' | 'Selesai' | 'Selesai Dibayar' | 'Belum Dibayar' | 'Dibatalkan';

export type Transaction = {
  id: string;
  receiptNumber: number;
  storeId: string;
  customerId: string;
  customerName: string;
  staffId: string;
  createdAt: string; // ISO 8601
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceFeeAmount: number;
  totalAmount: number; // subtotal - discountAmount
  paymentMethod: 'Cash' | 'Card' | 'QRIS' | 'Belum Dibayar';
  pointsEarned: number;
  pointsRedeemed: number;
  items: TransactionItem[];
  tableId?: string; // Optional table reference
  status: TransactionStatus;
  generatedFollowUpText?: string;
};

export type TransactionItem = {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    notes?: string;
}

export type CartItem = TransactionItem;

export type OrderPayload = {
    storeId: string;
    customer: Customer;
    cart: CartItem[];
    subtotal: number;
    taxAmount: number;
    serviceFeeAmount: number;
    totalAmount: number;
};

export type PendingOrder = {
  id: string;
  storeId: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl: string;
  productId: string;
  productName: string;
  quantity: number;
  createdAt: string; // ISO 8601
};

export type RedemptionOption = {
  id: string;
  description: string;
  pointsRequired: number;
  value: number;
  isActive: boolean;
};

export type Challenge = {
  tier: string;
  description: string;
  target: number;
  reward: string;
};

export type ChallengePeriod = {
  id: string;
  startDate: string;
  endDate: string;
  period: string;
  challenges: Challenge[];
  isActive: boolean;
  createdAt: string;
};

export type TableStatus = 'Tersedia' | 'Terisi' | 'Dipesan' | 'Menunggu Dibersihkan';

export type TableOrderCustomer = Pick<Customer, 'id' | 'name' | 'phone' | 'avatarUrl'>;

export type TableOrder = {
  items: CartItem[];
  totalAmount: number;
  orderTime: string; // ISO 8601
  customer?: TableOrderCustomer;
};

export type Table = {
  id: string;
  name: string;
  status: TableStatus;
  capacity: number;
  isVirtual?: boolean;
  currentOrder?: TableOrder | null;
};

export type TopUpRequest = {
  id: string;
  storeId: string;
  storeName: string;
  userId: string;
  userName: string;
  amount: number;
  tokensToAdd: number;
  uniqueCode: number;
  totalAmount: number;
  proofUrl: string;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: string; // ISO 8601 string
  processedAt?: string; // ISO 8601 string
};

export type TransactionFeeSettings = {
  tokenValueRp: number;
  feePercentage: number;
  minFeeRp: number;
  maxFeeRp: number;
  aiUsageFee: number;
  newStoreBonusTokens: number;
  aiBusinessPlanFee: number;
  aiSessionFee: number;
  aiSessionDurationMinutes: number;
  catalogTrialFee: number;
  catalogTrialDurationMonths: number;
  catalogMonthlyFee: number;
  catalogSixMonthFee: number;
  catalogYearlyFee: number;
};

export type AppliedStrategy = {
  id: string;
  type: 'weekly' | 'monthly';
  recommendation: string;
  appliedDate: string;
  status: 'active' | 'completed';
};

export type AdminRecommendationOutput = {
  weeklyRecommendation: string;
  monthlyRecommendation: string;
};

export type WhatsappSettings = {
  deviceId: string;
  adminGroup: string;
};

// Types for Catalog AI Assistant
export type ProductInfo = {
    name: string;
    description?: string;
    price: number;
};

export type CatalogAssistantInput = {
  userQuestion: string;
  productContext: ProductInfo;
  storeName: string;
};
export type CatalogAssistantOutput = {
  answer: string;
};
