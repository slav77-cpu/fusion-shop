export interface Product {
  id: string;
  title: string;
  variantName?: string;
  brand?: string;
  category?: string;
  packLabel?: string;
  pcs?: number;
  sizeMl?: number;
  price: number;
  imageUrl?: string;
  stockQty: number;
  // Derived server-side (stockQty > 0) — kept so ProductCard/Cart/etc don't
  // need to know about stockQty at all.
  inStock: boolean;
  tag?: string;
  groupId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockAudit {
  id: string;
  productId: string;
  productTitle?: string;
  systemQty: number;
  countedQty: number;
  difference: number;
  note?: string;
  createdAt: string;
}

export interface CartItem {
  id: string;
  title: string;
  variantName?: string;
  price: number;
  packLabel?: string;
  imageUrl?: string;
  qty: number;
}

export type OrderStatus = "new" | "confirmed" | "shipped" | "done" | "cancelled";
export type PaymentMethod = "cod" | "card";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
  note?: string;
}

export interface OrderLineItem {
  productId?: string | null;
  title: string;
  variantName?: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  customer: OrderCustomer;
  items: OrderLineItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductsMeta {
  categories: string[];
  brands: string[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiErrorBody {
  message?: string;
}
