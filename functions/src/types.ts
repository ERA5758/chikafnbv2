
export type TransactionStatus = 'Diproses' | 'Siap Diambil' | 'Selesai' | 'Selesai Dibayar' | 'Belum Dibayar' | 'Dibatalkan';

export type CartItem = {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    notes?: string;
    storeId?: string;
    storeName?: string;
};

export type TransactionItem = CartItem;

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
  totalAmount: number;
  paymentMethod: 'Cash' | 'Card' | 'QRIS' | 'Belum Dibayar' | 'Lunas (Pusat)';
  pointsEarned: number;
  pointsRedeemed: number;
  items: TransactionItem[];
  tableId?: string;
  status: TransactionStatus;
  generatedFollowUpText?: string;
  pujaseraGroupSlug?: string;
  itemsStatus?: { [key: string]: 'Diproses' | 'Siap Diambil' }; // For pujasera kitchen status tracking
  notes?: string;
  parentTransactionId?: string;
  pujaseraId?: string;
};

export type PointEarningSettings = {
  rpPerPoint: number;
};
