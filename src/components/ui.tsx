import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { translations, TranslationKey } from '../i18n/translations';
import { Language, Theme, AppSettings, User, Brand, Product, Receipt } from '../types';
import * as storage from '../utils/storage';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

// Toast Context
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toasts: [], addToast: () => {}, removeToast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm animate-fadeIn ${
            toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <Info size={16} />}
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// App Context
interface AppContextType {
  user: User | null;
  language: Language;
  theme: Theme;
  activeBrandId: string | null;
  brands: Brand[];
  products: Product[];
  receipts: Receipt[];
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setActiveBrand: (id: string | null) => void;
  refreshData: () => void;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (email: string, password: string, name: string) => { success: boolean; error?: string };
  logout: () => void;
  activeBrand: Brand | null;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export function useApp() { return useContext(AppContext); }

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const refreshData = useCallback(() => {
    if (user) {
      setBrands(storage.getBrands(user.id));
      setProducts(storage.getProducts(undefined, user.id));
      setReceipts(storage.getReceipts(user.id));
    }
  }, [user]);

  useEffect(() => {
    const userId = storage.getCurrentUserId();
    if (userId) {
      const users = storage.getUsers();
      const u = users.find(u => u.id === userId);
      if (u) {
        setUser(u);
        const s = storage.getSettings();
        setSettings(s);
      }
    }
  }, []);

  useEffect(() => {
    if (user) refreshData();
  }, [user, refreshData]);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    storage.saveSettings(settings);
  }, [settings]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[settings.language]?.[key] || translations.uz[key] || key;
  }, [settings.language]);

  const setLanguage = (lang: Language) => setSettings(prev => ({ ...prev, language: lang }));
  const setTheme = (theme: Theme) => setSettings(prev => ({ ...prev, theme }));
  const setActiveBrand = (id: string | null) => setSettings(prev => ({ ...prev, activeBrandId: id }));

  const login = (email: string, password: string) => {
    const result = storage.loginUser(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const register = (email: string, password: string, name: string) => {
    const result = storage.registerUser(email, password, name);
    if (result.success && result.user) {
      setUser(result.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const logout = () => {
    storage.logoutUser();
    setUser(null);
    setBrands([]);
    setProducts([]);
    setReceipts([]);
  };

  const activeBrand = brands.find(b => b.id === settings.activeBrandId) || brands[0] || null;

  return (
    <AppContext.Provider value={{
      user, language: settings.language, theme: settings.theme,
      activeBrandId: settings.activeBrandId, brands, products, receipts,
      t, setLanguage, setTheme, setActiveBrand, refreshData,
      login, register, logout, activeBrand,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// Modal Component
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full ${sizeClass} mx-4 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// Confirm Dialog
export function ConfirmDialog({ open, onClose, onConfirm, title, message }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string;
}) {
  const { t } = useApp();
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
            {t('no')}
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
            {t('yes')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Button Component
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled = false, type = 'button', className = '' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg'; disabled?: boolean; type?: 'button' | 'submit'; className?: string;
}) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}

// Input Component
export function Input({ label, error, ...props }: {
  label?: string; error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <input {...props} className={`w-full px-3 py-2 rounded-lg border ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`} />
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

// Select Component
export function Select({ label, error, children, ...props }: {
  label?: string; error?: string; children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <select {...props} className={`w-full px-3 py-2 rounded-lg border ${error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm`}>
        {children}
      </select>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
