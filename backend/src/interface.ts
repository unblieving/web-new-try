// --- User ---
export interface User {
  id: number;
  studentId: string;
  username: string;
  role: "user" | "admin";
  createdAt: string;
}

export interface CreateUserInput {
  studentId: string;
  username: string;
  password: string;
}

export interface LoginInput {
  studentId: string;
  password: string;
}

// --- Category ---
export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  children?: Category[];
}

// --- Item ---
export type ItemStatus =
  | "pending_review"
  | "listed"
  | "reserved"
  | "sold"
  | "rejected"
  | "removed";

export interface Item {
  id: number;
  sellerId: number;
  categoryId: number;
  title: string;
  description: string | null;
  price: number;
  quantity: number;
  availableQuantity: number;
  status: ItemStatus;
  rejectReason: string | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
  seller?: { id: number; username: string; studentId: string };
  category?: { id: number; name: string };
}

export interface CreateItemInput {
  categoryId: number;
  title: string;
  description?: string;
  price: number;
  quantity?: number;
  images?: string[];
}

export interface UpdateItemInput {
  categoryId?: number;
  title?: string;
  description?: string;
  price?: number;
  quantity?: number;
  images?: string[];
}

export interface ItemListQuery {
  page?: number;
  pageSize?: number;
  categoryId?: number;
  keyword?: string;
  sortBy?: "created_at" | "price";
  sortOrder?: "asc" | "desc";
}

// --- Order ---
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "completed"
  | "cancelled";

export interface Order {
  id: number;
  orderNo: string;
  buyerId: number;
  itemId: number;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  item?: Item;
}

export interface CreateOrderInput {
  itemId: number;
  quantity?: number;
}

// --- Favorite ---
export interface Favorite {
  id: number;
  userId: number;
  itemId: number;
  createdAt: string;
  item?: Item;
}

// --- Pagination ---
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}