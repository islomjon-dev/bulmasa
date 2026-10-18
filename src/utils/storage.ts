import { User, Brand, Product, Receipt, AppSettings } from '../types';

const KEYS = {
  USERS: 'cy_users',
  CURRENT_USER: 'cy_current_user',
  BRANDS: 'cy_brands',
  PRODUCTS: 'cy_products',
  RECEIPTS: 'cy_receipts',
  SETTINGS: 'cy_settings',
};

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Simple hash function for passwords (in production, use bcrypt on server)
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + password.length;
}

// Users
export function getUsers(): User[] { return get<User[]>(KEYS.USERS, []); }
export function saveUsers(users: User[]): void { set(KEYS.USERS, users); }
export function getCurrentUserId(): string | null { return get<string | null>(KEYS.CURRENT_USER, null); }
export function setCurrentUserId(id: string | null): void { set(KEYS.CURRENT_USER, id); }

export function registerUser(email: string, password: string, name: string): { success: boolean; error?: string; user?: User } {
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'emailExists' };
  }
  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    name,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  setCurrentUserId(user.id);
  return { success: true, user };
}

export function loginUser(email: string, password: string): { success: boolean; error?: string; user?: User } {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hashPassword(password));
  if (!user) return { success: false, error: 'invalidCredentials' };
  setCurrentUserId(user.id);
  return { success: true, user };
}

export function logoutUser(): void { setCurrentUserId(null); }

// Brands
export function getBrands(userId?: string): Brand[] {
  const brands = get<Brand[]>(KEYS.BRANDS, []);
  return userId ? brands.filter(b => b.userId === userId) : brands;
}
export function saveBrands(brands: Brand[]): void { set(KEYS.BRANDS, brands); }
export function addBrand(brand: Brand): void {
  const brands = get<Brand[]>(KEYS.BRANDS, []);
  brands.push(brand);
  saveBrands(brands);
}
export function updateBrand(updated: Brand): void {
  const brands = get<Brand[]>(KEYS.BRANDS, []);
  const idx = brands.findIndex(b => b.id === updated.id);
  if (idx >= 0) brands[idx] = updated;
  saveBrands(brands);
}
export function deleteBrand(id: string): void {
  const brands = get<Brand[]>(KEYS.BRANDS, []).filter(b => b.id !== id);
  saveBrands(brands);
}

// Products
export function getProducts(brandId?: string, userId?: string): Product[] {
  const products = get<Product[]>(KEYS.PRODUCTS, []);
  let filtered = products;
  if (userId) filtered = filtered.filter(p => p.userId === userId);
  if (brandId) filtered = filtered.filter(p => p.brandId === brandId);
  return filtered;
}
export function saveProducts(products: Product[]): void { set(KEYS.PRODUCTS, products); }
export function addProduct(product: Product): void {
  const products = get<Product[]>(KEYS.PRODUCTS, []);
  products.push(product);
  saveProducts(products);
}
export function updateProduct(updated: Product): void {
  const products = get<Product[]>(KEYS.PRODUCTS, []);
  const idx = products.findIndex(p => p.id === updated.id);
  if (idx >= 0) products[idx] = updated;
  saveProducts(products);
}
export function deleteProduct(id: string): void {
  const products = get<Product[]>(KEYS.PRODUCTS, []).filter(p => p.id !== id);
  saveProducts(products);
}

// Receipts
export function getReceipts(userId?: string): Receipt[] {
  const receipts = get<Receipt[]>(KEYS.RECEIPTS, []);
  return userId ? receipts.filter(r => r.userId === userId) : receipts;
}
export function saveReceipts(receipts: Receipt[]): void { set(KEYS.RECEIPTS, receipts); }
export function addReceipt(receipt: Receipt): void {
  const receipts = get<Receipt[]>(KEYS.RECEIPTS, []);
  receipts.push(receipt);
  saveReceipts(receipts);
}
export function updateReceipt(updated: Receipt): void {
  const receipts = get<Receipt[]>(KEYS.RECEIPTS, []);
  const idx = receipts.findIndex(r => r.id === updated.id);
  if (idx >= 0) receipts[idx] = updated;
  saveReceipts(receipts);
}

// Settings
export function getSettings(): AppSettings {
  return get<AppSettings>(KEYS.SETTINGS, { language: 'uz', theme: 'light', activeBrandId: null });
}
export function saveSettings(settings: AppSettings): void { set(KEYS.SETTINGS, settings); }

// Receipt number generation
export function generateReceiptNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `RC-${date}-${random}`;
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(amount)) + " so'm";
}

// Format date
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(dateStr: string): string {
  return formatDate(dateStr) + ' ' + formatTime(dateStr);
}
