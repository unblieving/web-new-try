import type {
  AuthResponse,
  Category,
  CreateItemInput,
  Favorite,
  Item,
  ItemListQuery,
  Order,
  PaginatedResult,
  User,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.message ?? `请求失败 (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

// --- Auth ---
export async function register(
  studentId: string,
  username: string,
  password: string,
): Promise<AuthResponse> {
  const res = await request<{ data: AuthResponse }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ studentId, username, password }),
  });
  setToken(res.data.token);
  return res.data;
}

export async function login(
  studentId: string,
  password: string,
): Promise<AuthResponse> {
  const res = await request<{ data: AuthResponse }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ studentId, password }),
  });
  setToken(res.data.token);
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await request<{ data: User }>("/api/auth/me");
  return res.data;
}

export function logout() {
  clearToken();
}

// --- Categories ---
export async function getCategories(): Promise<Category[]> {
  const res = await request<{ data: Category[] }>("/api/categories");
  return res.data;
}

export async function getCategoriesFlat(): Promise<Category[]> {
  const res = await request<{ data: Category[] }>("/api/categories/flat");
  return res.data;
}

// --- Items ---
export async function getItems(
  query: ItemListQuery = {},
): Promise<PaginatedResult<Item>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  const qs = params.toString();
  const res = await request<{ data: PaginatedResult<Item> }>(
    `/api/items${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function getItem(id: number): Promise<Item> {
  const res = await request<{ data: Item }>(`/api/items/${id}`);
  return res.data;
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const res = await request<{ data: Item }>("/api/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function getMyItems(
  query: ItemListQuery & { status?: string } = {},
): Promise<PaginatedResult<Item>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  const res = await request<{ data: PaginatedResult<Item> }>(
    `/api/items/my${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

// --- Orders ---
export async function createOrder(
  itemId: number,
  quantity = 1,
): Promise<Order> {
  const res = await request<{ data: Order }>("/api/orders", {
    method: "POST",
    body: JSON.stringify({ itemId, quantity }),
  });
  return res.data;
}

export async function getMyOrders(
  query: {
    page?: number;
    pageSize?: number;
    status?: string;
  } = {},
): Promise<PaginatedResult<Order>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  const res = await request<{ data: PaginatedResult<Order> }>(
    `/api/orders${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function getOrder(id: number): Promise<Order> {
  const res = await request<{ data: Order }>(`/api/orders/${id}`);
  return res.data;
}

export async function payOrder(id: number): Promise<Order> {
  const res = await request<{ data: Order }>(`/api/orders/${id}/pay`, {
    method: "POST",
  });
  return res.data;
}

export async function confirmOrder(id: number): Promise<Order> {
  const res = await request<{ data: Order }>(`/api/orders/${id}/confirm`, {
    method: "POST",
  });
  return res.data;
}

export async function cancelOrder(id: number): Promise<Order> {
  const res = await request<{ data: Order }>(`/api/orders/${id}/cancel`, {
    method: "POST",
  });
  return res.data;
}

// --- Favorites ---
export async function getFavorites(): Promise<Favorite[]> {
  const res = await request<{ data: Favorite[] }>("/api/favorites");
  return res.data;
}

export async function addFavorite(itemId: number): Promise<Favorite> {
  const res = await request<{ data: Favorite }>(`/api/favorites/${itemId}`, {
    method: "POST",
  });
  return res.data;
}

export async function removeFavorite(itemId: number): Promise<void> {
  await request(`/api/favorites/${itemId}`, { method: "DELETE" });
}

export async function checkFavorite(
  itemId: number,
): Promise<{ isFavorited: boolean }> {
  const res = await request<{ data: { isFavorited: boolean } }>(
    `/api/favorites/check/${itemId}`,
  );
  return res.data;
}

// --- Admin ---
export async function adminListItems(
  query: {
    page?: number;
    pageSize?: number;
    status?: string;
  } = {},
): Promise<PaginatedResult<Item>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  const res = await request<{ data: PaginatedResult<Item> }>(
    `/api/admin/items${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function approveItem(id: number): Promise<Item> {
  const res = await request<{ data: Item }>(`/api/admin/items/${id}/approve`, {
    method: "POST",
  });
  return res.data;
}

export async function rejectItem(id: number, reason: string): Promise<Item> {
  const res = await request<{ data: Item }>(`/api/admin/items/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

export async function removeItem(id: number): Promise<Item> {
  const res = await request<{ data: Item }>(`/api/admin/items/${id}/remove`, {
    method: "POST",
  });
  return res.data;
}
