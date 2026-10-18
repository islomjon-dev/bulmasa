import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp, useToast, ToastProvider, Modal, ConfirmDialog, Button, Input, Select } from './components/ui';
import ReceiptPreview, { receiptToText } from './components/ReceiptPreview';
import { Brand, Product, Receipt, ReceiptItem, PaymentDetails, Language, Theme } from './types';
import * as storage from './utils/storage';
import { formatCurrency, formatDate, formatTime, formatDateTime } from './utils/storage';
import {
  LayoutDashboard, Receipt as ReceiptIcon, Package, History, BarChart3, Settings,
  Store, Plus, Search, Edit, Trash2, Archive, Download, Upload, Printer,
  Share2, Copy, Eye, Menu, X, Sun, Moon, Globe, LogOut, ChevronLeft,
  FileText, CheckCircle, AlertCircle, ArrowUpDown, Filter
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Auth Page
function AuthPage() {
  const { t, login, register } = useApp();
  const { addToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!email) errs.email = t('required');
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = t('invalidEmail');
    if (!password) errs.password = t('required');
    if (!isLogin) {
      if (!name) errs.name = t('required');
      if (password !== confirmPwd) errs.confirmPwd = t('passwordMismatch');
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (isLogin) {
      const result = login(email, password);
      if (!result.success) addToast('error', t(result.error as any));
    } else {
      const result = register(email, password, name);
      if (!result.success) addToast('error', t(result.error as any));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ReceiptIcon className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('appName')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{isLogin ? t('login') : t('register')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Input label={t('name')} value={name} onChange={e => setName(e.target.value)} error={errors.name} placeholder="Ismingiz" />
          )}
          <Input label={t('email')} type="email" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} placeholder="email@example.com" />
          <Input label={t('password')} type="password" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} placeholder="••••••••" />
          {!isLogin && (
            <Input label={t('confirmPassword')} type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} error={errors.confirmPwd} placeholder="••••••••" />
          )}
          <Button type="submit" className="w-full" size="lg">{isLogin ? t('login') : t('register')}</Button>
        </form>

        <p className="text-center mt-6 text-sm text-slate-500">
          {isLogin ? t('noAccount') : t('hasAccount')}{' '}
          <button onClick={() => { setIsLogin(!isLogin); setErrors({}); }} className="text-blue-600 hover:underline font-medium">
            {isLogin ? t('register') : t('login')}
          </button>
        </p>
      </div>
    </div>
  );
}

// Layout
function Layout({ children }: { children: React.ReactNode }) {
  const { t, user, logout, language, theme, setLanguage, setTheme, brands, activeBrand, setActiveBrand } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/receipts/create', icon: Plus, label: t('createReceipt') },
    { path: '/products', icon: Package, label: t('products') },
    { path: '/history', icon: History, label: t('receiptHistory') },
    { path: '/statistics', icon: BarChart3, label: t('statistics') },
    { path: '/brands', icon: Store, label: t('brands') },
    { path: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <ReceiptIcon className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white text-sm">{t('appName')}</h1>
                <p className="text-xs text-slate-500 truncate">{user?.name}</p>
              </div>
            </div>
          </div>

          {/* Brand selector */}
          {brands.length > 0 && (
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <select
                value={activeBrand?.id || ''}
                onChange={e => setActiveBrand(e.target.value || null)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <select value={language} onChange={e => setLanguage(e.target.value as Language)} className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                <option value="uz">O'zbekcha</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
            <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut size={16} /> {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <Menu size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="font-semibold text-slate-900 dark:text-white">{t('appName')}</h1>
        </header>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

// Dashboard
function DashboardPage() {
  const { t, receipts, brands, products, activeBrand } = useApp();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().slice(0, 10);
  const userReceipts = activeBrand ? receipts.filter(r => r.brandId === activeBrand.id && !r.cancelled) : receipts.filter(r => !r.cancelled);
  const todayReceipts = userReceipts.filter(r => r.createdAt.slice(0, 10) === todayStr);
  const totalSales = userReceipts.reduce((sum, r) => sum + r.total, 0);
  const todaySales = todayReceipts.reduce((sum, r) => sum + r.total, 0);

  const recentReceipts = [...userReceipts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('welcome')}, {activeBrand?.name || ''}</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('totalReceipts')} value={userReceipts.length.toString()} icon={<ReceiptIcon size={20} />} color="blue" />
        <StatCard title={t('totalSales')} value={formatCurrency(totalSales)} icon={<BarChart3 size={20} />} color="green" />
        <StatCard title={t('todaySales')} value={formatCurrency(todaySales)} icon={<FileText size={20} />} color="purple" />
        <StatCard title={t('totalProducts')} value={products.filter(p => !p.archived && (!activeBrand || p.brandId === activeBrand.id)).length.toString()} icon={<Package size={20} />} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('quickActions')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/receipts/create')} className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition">
              <Plus size={18} /><span className="text-sm font-medium">{t('createReceipt')}</span>
            </button>
            <button onClick={() => navigate('/products')} className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition">
              <Package size={18} /><span className="text-sm font-medium">{t('addProduct')}</span>
            </button>
            <button onClick={() => navigate('/history')} className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
              <History size={18} /><span className="text-sm font-medium">{t('receiptHistory')}</span>
            </button>
            <button onClick={() => navigate('/statistics')} className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition">
              <BarChart3 size={18} /><span className="text-sm font-medium">{t('statistics')}</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('recentReceipts')}</h3>
          {recentReceipts.length === 0 ? (
            <p className="text-sm text-slate-500">{t('noReceipts')}</p>
          ) : (
            <div className="space-y-2">
              {recentReceipts.map(r => (
                <button key={r.id} onClick={() => navigate(`/history/${r.id}`)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{r.receiptNumber}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(r.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(r.total)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Brands Page
function BrandsPage() {
  const { t, user, brands, activeBrand, setActiveBrand, refreshData } = useApp();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; footerText: string; address: string; phone: string; primaryColor: string; textColor: string; fontSize: number; qrContent: 'receipt_id' | 'public_link'; defaultTemplate: 'classic' | 'modern' | 'minimal'; logo: string | null }>({ name: '', footerText: 'Rahmat!', address: '', phone: '', primaryColor: '#2563eb', textColor: '#1a1a1a', fontSize: 14, qrContent: 'receipt_id', defaultTemplate: 'classic', logo: null });

  const openCreate = () => { setEditingBrand(null); setForm({ name: '', footerText: 'Rahmat!', address: '', phone: '', primaryColor: '#2563eb', textColor: '#1a1a1a', fontSize: 14, qrContent: 'receipt_id' as const, defaultTemplate: 'classic' as const, logo: null }); setShowModal(true); };
  const openEdit = (b: Brand) => { setEditingBrand(b); setForm({ name: b.name, footerText: b.footerText, address: b.address, phone: b.phone, primaryColor: b.primaryColor, textColor: b.textColor, fontSize: b.fontSize, qrContent: b.qrContent, defaultTemplate: b.defaultTemplate, logo: b.logo }); setShowModal(true); };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, logo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) { addToast('error', t('required')); return; }
    if (editingBrand) {
      storage.updateBrand({ ...editingBrand, ...form, name: form.name.trim() });
      addToast('success', t('brandUpdated'));
    } else {
      const brand: Brand = { id: crypto.randomUUID(), userId: user!.id, name: form.name.trim(), logo: form.logo, primaryColor: form.primaryColor, textColor: form.textColor, fontSize: form.fontSize, footerText: form.footerText, address: form.address, phone: form.phone, qrContent: form.qrContent, defaultTemplate: form.defaultTemplate, createdAt: new Date().toISOString() };
      storage.addBrand(brand);
      if (!activeBrand) setActiveBrand(brand.id);
      addToast('success', t('brandCreated'));
    }
    refreshData();
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    storage.deleteBrand(id);
    if (activeBrand?.id === id) setActiveBrand(null);
    refreshData();
    addToast('success', t('brandDeleted'));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('brands')}</h2>
        <Button onClick={openCreate}><Plus size={16} className="mr-1" />{t('addBrand')}</Button>
      </div>

      {brands.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <Store size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 mb-4">{t('noBrands')}</p>
          <Button onClick={openCreate}>{t('createFirstBrand')}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map(brand => (
            <div key={brand.id} className={`bg-white dark:bg-slate-800 rounded-xl p-5 border-2 transition ${activeBrand?.id === brand.id ? 'border-blue-500' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {brand.logo ? <img src={brand.logo} alt="" className="w-10 h-10 rounded-lg object-contain" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: brand.primaryColor }}><Store size={18} className="text-white" /></div>}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{brand.name}</h3>
                    <p className="text-xs text-slate-500">{t(brand.defaultTemplate)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={() => setActiveBrand(brand.id)} className={`flex-1 text-xs py-1.5 rounded-lg font-medium ${activeBrand?.id === brand.id ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {activeBrand?.id === brand.id ? '✓ ' + t('activeBrand') : t('switchBrand')}
                </button>
                <button onClick={() => openEdit(brand)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Edit size={14} className="text-slate-500" /></button>
                <button onClick={() => setConfirmDelete(brand.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={14} className="text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingBrand ? t('editBrand') : t('addBrand')} size="lg">
        <div className="space-y-4">
          <Input label={t('brandName')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Do'kon nomi" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('primaryColor')}</label>
              <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('textColor')}</label>
              <input type="color" value={form.textColor} onChange={e => setForm(f => ({ ...f, textColor: e.target.value }))} className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-600 cursor-pointer" />
            </div>
          </div>
          <Input label={t('footerText')} value={form.footerText} onChange={e => setForm(f => ({ ...f, footerText: e.target.value }))} />
          <Input label={t('address')} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <Input label={t('phone')} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('logo')}</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            {form.logo && <img src={form.logo} alt="" className="w-16 h-16 mt-2 object-contain rounded" />}
          </div>
          <Select label={t('qrContent')} value={form.qrContent} onChange={e => setForm(f => ({ ...f, qrContent: e.target.value as any }))}>
            <option value="receipt_id">{t('receiptId')}</option>
            <option value="public_link">{t('publicLink')}</option>
          </Select>
          <Select label={t('defaultTemplate')} value={form.defaultTemplate} onChange={e => setForm(f => ({ ...f, defaultTemplate: e.target.value as any }))}>
            <option value="classic">{t('classic')}</option>
            <option value="modern">{t('modern')}</option>
            <option value="minimal">{t('minimal')}</option>
          </Select>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && handleDelete(confirmDelete)} title={t('confirmDelete')} message={t('confirmDelete')} />
    </div>
  );
}

// Products Page
function ProductsPage() {
  const { t, user, products, activeBrand, refreshData } = useApp();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', price: '', barcode: '', sku: '', category: '', unit: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => (!activeBrand || p.brandId === activeBrand.id));
    if (!showArchived) list = list.filter(p => !p.archived);
    else list = list.filter(p => p.archived);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s) || (p.barcode && p.barcode.includes(s)));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, activeBrand, search, showArchived]);

  const openCreate = () => { setEditingProduct(null); setForm({ name: '', price: '', barcode: '', sku: '', category: '', unit: '' }); setShowModal(true); };
  const openEdit = (p: Product) => { setEditingProduct(p); setForm({ name: p.name, price: p.price.toString(), barcode: p.barcode || '', sku: p.sku || '', category: p.category || '', unit: p.unit || '' }); setShowModal(true); };

  const handleSave = () => {
    if (!form.name.trim() || !form.price) { addToast('error', t('required')); return; }
    const price = parseInt(form.price);
    if (isNaN(price) || price < 0) { addToast('error', t('negativePrice')); return; }
    
    if (form.barcode) {
      const existing = products.find(p => p.barcode === form.barcode && p.id !== editingProduct?.id);
      if (existing) { addToast('error', t('barcodeExists')); return; }
    }

    if (editingProduct) {
      storage.updateProduct({ ...editingProduct, name: form.name.trim(), price, barcode: form.barcode || null, sku: form.sku || null, category: form.category || null, unit: form.unit || null });
      addToast('success', t('productUpdated'));
    } else {
      const product: Product = { id: crypto.randomUUID(), brandId: activeBrand!.id, userId: user!.id, name: form.name.trim(), price, barcode: form.barcode || null, sku: form.sku || null, category: form.category || null, unit: form.unit || null, image: null, archived: false, createdAt: new Date().toISOString() };
      storage.addProduct(product);
      addToast('success', t('productAdded'));
    }
    refreshData();
    setShowModal(false);
  };

  const handleArchive = (p: Product) => {
    storage.updateProduct({ ...p, archived: !p.archived });
    refreshData();
    addToast('success', p.archived ? t('productAdded') : t('productArchived'));
  };

  const handleExport = () => {
    const data = filteredProducts.map(p => ({ name: p.name, price: p.price, barcode: p.barcode || '', sku: p.sku || '', category: p.category || '', unit: p.unit || '' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products.xlsx');
    addToast('success', t('exportSuccess'));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBrand) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
        let imported = 0;
        rows.forEach(row => {
          const name = row.name || row.Name || row.NAME;
          const price = parseInt(row.price || row.Price || row.PRICE || 0);
          if (name && !isNaN(price) && price >= 0) {
            const product: Product = { id: crypto.randomUUID(), brandId: activeBrand.id, userId: user!.id, name: String(name), price, barcode: String(row.barcode || row.Barcode || ''), sku: String(row.sku || row.SKU || ''), category: String(row.category || row.Category || ''), unit: String(row.unit || row.Unit || ''), image: null, archived: false, createdAt: new Date().toISOString() };
            storage.addProduct(product);
            imported++;
          }
        });
        refreshData();
        addToast('success', `${t('importSuccess')}: ${imported}`);
      } catch {
        addToast('error', t('importError'));
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!activeBrand) {
    return <div className="text-center py-12"><p className="text-slate-500">{t('selectBrand')}</p></div>;
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('products')}</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={14} className="mr-1" />{t('import')}</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <Button variant="secondary" size="sm" onClick={handleExport}><Download size={14} className="mr-1" />{t('export')}</Button>
          <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" />{t('addProduct')}</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search') + '...'} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white" />
        </div>
        <button onClick={() => setShowArchived(!showArchived)} className="text-sm text-blue-600 hover:underline whitespace-nowrap">
          {showArchived ? t('hideArchived') : t('showArchived')}
        </button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <Package size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 mb-4">{t('noProducts')}</p>
          <Button onClick={openCreate}>{t('createFirstProduct')}</Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('productName')}</th>
                  <th>{t('price')}</th>
                  <th className="hidden sm:table-cell">{t('barcode')}</th>
                  <th className="hidden md:table-cell">{t('category')}</th>
                  <th>{t('edit')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} className={p.archived ? 'opacity-50' : ''}>
                    <td className="font-medium text-slate-900 dark:text-white">{p.name}</td>
                    <td>{formatCurrency(p.price)}</td>
                    <td className="hidden sm:table-cell text-slate-500 text-sm">{p.barcode || '-'}</td>
                    <td className="hidden md:table-cell text-slate-500 text-sm">{p.category || '-'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Edit size={14} className="text-blue-500" /></button>
                        <button onClick={() => handleArchive(p)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Archive size={14} className="text-orange-500" /></button>
                        <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={14} className="text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingProduct ? t('editProduct') : t('addProduct')}>
        <div className="space-y-4">
          <Input label={t('productName')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label={t('price')} type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <Input label={t('barcode')} value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
          <Input label={t('sku')} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          <Input label={t('category')} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <Input label={t('unit')} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="dona, kg, l" />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleSave}>{t('save')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => { if (confirmDelete) { storage.deleteProduct(confirmDelete); refreshData(); } }} title={t('confirmDelete')} message={t('confirmDelete')} />
    </div>
  );
}

// Create Receipt Page
function CreateReceiptPage() {
  const { t, user, products, activeBrand, receipts, refreshData } = useApp();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [cashAmount, setCashAmount] = useState(0);
  const [cardAmount, setCardAmount] = useState(0);
  const [search, setSearch] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [manualItem, setManualItem] = useState({ name: '', quantity: '1', price: '', saveToCatalog: false });
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<'classic' | 'modern' | 'minimal'>(activeBrand?.defaultTemplate || 'classic');

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = Math.max(0, subtotal - discount);

  const catalogProducts = useMemo(() => {
    if (!activeBrand) return [];
    let list = products.filter(p => p.brandId === activeBrand.id && !p.archived);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(s) || (p.barcode && p.barcode.includes(s)));
    }
    return list;
  }, [products, activeBrand, search]);

  const addItem = (name: string, quantity: number, unitPrice: number) => {
    const lineTotal = Math.round(quantity * unitPrice);
    const item: ReceiptItem = { id: crypto.randomUUID(), name, quantity, unitPrice, lineTotal };
    setItems(prev => [...prev, item]);
  };

  const updateItem = (id: string, field: 'quantity' | 'unitPrice', value: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      updated.lineTotal = Math.round(updated.quantity * updated.unitPrice);
      return updated;
    }));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const handleAddFromCatalog = (p: Product) => {
    addItem(p.name, 1, p.price);
    setShowCatalog(false);
    setSearch('');
  };

  const handleManualAdd = () => {
    if (!manualItem.name.trim() || !manualItem.price) { addToast('error', t('required')); return; }
    const qty = parseInt(manualItem.quantity) || 1;
    const price = parseInt(manualItem.price);
    if (qty <= 0 || price < 0) { addToast('error', t('negativeQuantity')); return; }
    addItem(manualItem.name.trim(), qty, price);
    
    if (manualItem.saveToCatalog && activeBrand) {
      const product: Product = { id: crypto.randomUUID(), brandId: activeBrand.id, userId: user!.id, name: manualItem.name.trim(), price, barcode: null, sku: null, category: null, unit: null, image: null, archived: false, createdAt: new Date().toISOString() };
      storage.addProduct(product);
      refreshData();
    }
    
    setManualItem({ name: '', quantity: '1', price: '', saveToCatalog: false });
    setShowManual(false);
  };

  const handleSave = () => {
    if (items.length === 0) { addToast('error', t('emptyReceipt')); return; }
    if (discount < 0) { addToast('error', t('negativePrice')); return; }
    if (discount > subtotal) { addToast('error', t('discountTooLarge')); return; }
    if (paymentType === 'mixed') {
      if (cashAmount + cardAmount !== total) { addToast('error', t('paymentMismatch')); return; }
    }
    setSaving(true);
    setTimeout(() => {
      const receipt: Receipt = {
        id: crypto.randomUUID(),
        receiptNumber: storage.generateReceiptNumber(),
        brandId: activeBrand!.id,
        userId: user!.id,
        items: [...items],
        subtotal,
        discount,
        total,
        payment: { type: paymentType, cashAmount: paymentType === 'mixed' ? cashAmount : paymentType === 'cash' ? total : 0, cardAmount: paymentType === 'mixed' ? cardAmount : paymentType === 'card' ? total : 0 },
        brandSnapshot: { name: activeBrand!.name, logo: activeBrand!.logo, primaryColor: activeBrand!.primaryColor, textColor: activeBrand!.textColor, footerText: activeBrand!.footerText, address: activeBrand!.address, phone: activeBrand!.phone },
        template,
        cancelled: false,
        createdAt: new Date().toISOString(),
      };
      storage.addReceipt(receipt);
      refreshData();
      setSaving(false);
      addToast('success', t('receiptCreated'));
      navigate(`/history/${receipt.id}`);
    }, 300);
  };

  if (!activeBrand) {
    return <div className="text-center py-12"><p className="text-slate-500">{t('selectBrand')}</p></div>;
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('createReceipt')}</h2>
        <div className="flex gap-2">
          <select value={template} onChange={e => setTemplate(e.target.value as any)} className="text-sm px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            <option value="classic">{t('classic')}</option>
            <option value="modern">{t('modern')}</option>
            <option value="minimal">{t('minimal')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Add items buttons */}
          <div className="flex gap-2">
            <Button onClick={() => setShowCatalog(true)}><Package size={16} className="mr-1" />{t('fromCatalog')}</Button>
            <Button variant="secondary" onClick={() => setShowManual(true)}><Plus size={16} className="mr-1" />{t('manualEntry')}</Button>
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('productName')}</th>
                      <th>{t('quantity')}</th>
                      <th>{t('unitPrice')}</th>
                      <th>{t('lineTotal')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="text-slate-400">{idx + 1}</td>
                        <td className="font-medium text-slate-900 dark:text-white">{item.name}</td>
                        <td><input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-center" /></td>
                        <td><input type="number" min="0" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)} className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-right" /></td>
                        <td className="font-medium">{formatCurrency(item.lineTotal)}</td>
                        <td><button onClick={() => removeItem(item.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={14} className="text-red-500" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
              <p className="text-slate-500 text-sm">{t('noProducts')}</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('subtotal')}</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{t('discount')}</span>
              <input type="number" min="0" max={subtotal} value={discount} onChange={e => setDiscount(Math.max(0, parseInt(e.target.value) || 0))} className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-right" />
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
              <span>{t('total')}</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <Select label={t('paymentType')} value={paymentType} onChange={e => setPaymentType(e.target.value as any)}>
              <option value="cash">{t('cash')}</option>
              <option value="card">{t('card')}</option>
              <option value="mixed">{t('mixed')}</option>
            </Select>
            {paymentType === 'mixed' && (
              <div className="space-y-2">
                <Input label={t('cashAmount')} type="number" min="0" value={cashAmount || ''} onChange={e => setCashAmount(parseInt(e.target.value) || 0)} />
                <Input label={t('cardAmount')} type="number" min="0" value={cardAmount || ''} onChange={e => setCardAmount(parseInt(e.target.value) || 0)} />
                {cashAmount + cardAmount !== total && (cashAmount > 0 || cardAmount > 0) && (
                  <p className="text-xs text-red-500">{t('paymentMismatch')}: {formatCurrency(cashAmount + cardAmount)} ≠ {formatCurrency(total)}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowPreview(true)} className="flex-1"><Eye size={16} className="mr-1" />{t('preview')}</Button>
            <Button onClick={handleSave} disabled={saving || items.length === 0} className="flex-1">{saving ? t('loading') : t('save')}</Button>
          </div>
        </div>
      </div>

      {/* Catalog Modal */}
      <Modal open={showCatalog} onClose={() => { setShowCatalog(false); setSearch(''); }} title={t('fromCatalog')} size="lg">
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search') + '...'} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" autoFocus />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {catalogProducts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">{t('noResults')}</p>
            ) : catalogProducts.map(p => (
              <button key={p.id} onClick={() => handleAddFromCatalog(p)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left">
                <span className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</span>
                <span className="text-sm text-slate-500">{formatCurrency(p.price)}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal open={showManual} onClose={() => setShowManual(false)} title={t('manualEntry')}>
        <div className="space-y-4">
          <Input label={t('productName')} value={manualItem.name} onChange={e => setManualItem(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('quantity')} type="number" min="1" value={manualItem.quantity} onChange={e => setManualItem(f => ({ ...f, quantity: e.target.value }))} />
            <Input label={t('price')} type="number" min="0" value={manualItem.price} onChange={e => setManualItem(f => ({ ...f, price: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={manualItem.saveToCatalog} onChange={e => setManualItem(f => ({ ...f, saveToCatalog: e.target.checked }))} className="rounded" />
            {t('saveToCatalog')}
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowManual(false)}>{t('cancel')}</Button>
            <Button onClick={handleManualAdd}>{t('add')}</Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)} title={t('receiptPreview')} size="md">
        {items.length > 0 && activeBrand && (
          <ReceiptPreview receipt={{
            id: 'preview',
            receiptNumber: 'PREVIEW',
            brandId: activeBrand.id,
            userId: user!.id,
            items,
            subtotal,
            discount,
            total,
            payment: { type: paymentType, cashAmount: paymentType === 'cash' ? total : 0, cardAmount: paymentType === 'card' ? total : 0 },
            brandSnapshot: { name: activeBrand.name, logo: activeBrand.logo, primaryColor: activeBrand.primaryColor, textColor: activeBrand.textColor, footerText: activeBrand.footerText, address: activeBrand.address, phone: activeBrand.phone },
            template,
            cancelled: false,
            createdAt: new Date().toISOString(),
          }} template={template} />
        )}
      </Modal>
    </div>
  );
}

// Receipt History Page
function ReceiptHistoryPage() {
  const { t, receipts, brands, activeBrand } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    let list = [...receipts].filter(r => !r.cancelled || true);
    if (brandFilter) list = list.filter(r => r.brandId === brandFilter);
    else if (activeBrand) list = list.filter(r => r.brandId === activeBrand.id);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r => r.receiptNumber.toLowerCase().includes(s) || r.brandSnapshot.name.toLowerCase().includes(s));
    }
    if (dateFrom) list = list.filter(r => r.createdAt >= dateFrom);
    if (dateTo) list = list.filter(r => r.createdAt <= dateTo + 'T23:59:59');
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [receipts, search, brandFilter, dateFrom, dateTo, activeBrand]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-4 animate-fadeIn">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('receiptHistory')}</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('search') + '...'} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
        </div>
        <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
          <option value="">{t('allBrands')}</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
      </div>

      {paginated.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <History size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500">{t('noReceipts')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('receiptNumber')}</th>
                  <th>{t('brands')}</th>
                  <th>{t('date')}</th>
                  <th>{t('total')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => (
                  <tr key={r.id} className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${r.cancelled ? 'opacity-50 line-through' : ''}`} onClick={() => navigate(`/history/${r.id}`)}>
                    <td className="font-mono text-sm">{r.receiptNumber}</td>
                    <td className="text-sm">{r.brandSnapshot.name}</td>
                    <td className="text-sm text-slate-500">{formatDateTime(r.createdAt)}</td>
                    <td className="font-semibold">{formatCurrency(r.total)}</td>
                    <td><Eye size={16} className="text-slate-400" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('previous')}</Button>
          <span className="text-sm text-slate-500">{t('page')} {page} {t('of')} {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('next')}</Button>
        </div>
      )}
    </div>
  );
}

// Receipt Detail Page
function ReceiptDetailPage() {
  const { t, user, receipts, refreshData } = useApp();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const receiptId = useLocation().pathname.split('/').pop() || '';
  const receipt = receipts.find(r => r.id === receiptId);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!receipt) return <div className="text-center py-12"><p className="text-slate-500">{t('noData')}</p></div>;

  const handlePdf = () => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
      const brand = receipt.brandSnapshot;
      let y = 10;
      doc.setFontSize(12);
      doc.text(brand.name, 40, y, { align: 'center' });
      y += 6;
      doc.setFontSize(7);
      if (brand.address) { doc.text(brand.address, 40, y, { align: 'center' }); y += 4; }
      if (brand.phone) { doc.text(brand.phone, 40, y, { align: 'center' }); y += 4; }
      y += 2;
      doc.text(`${t('receiptNumber')}: ${receipt.receiptNumber}`, 5, y); y += 4;
      doc.text(`${t('date')}: ${formatDateTime(receipt.createdAt)}`, 5, y); y += 4;
      doc.line(5, y, 75, y); y += 4;
      
      doc.setFontSize(7);
      receipt.items.forEach(item => {
        doc.text(item.name, 5, y); y += 3.5;
        doc.text(`  ${item.quantity} x ${formatCurrency(item.unitPrice)}`, 5, y);
        doc.text(formatCurrency(item.lineTotal), 75, y, { align: 'right' });
        y += 4;
      });
      
      doc.line(5, y, 75, y); y += 4;
      doc.text(`${t('subtotal')}: ${formatCurrency(receipt.subtotal)}`, 5, y); y += 4;
      if (receipt.discount > 0) { doc.text(`${t('discount')}: -${formatCurrency(receipt.discount)}`, 5, y); y += 4; }
      doc.setFontSize(9);
      doc.text(`${t('total')}: ${formatCurrency(receipt.total)}`, 5, y); y += 6;
      doc.setFontSize(7);
      doc.text(`${t('paymentType')}: ${t(receipt.payment.type as any)}`, 5, y); y += 6;
      doc.text(brand.footerText || t('thankYou'), 40, y, { align: 'center' });
      
      doc.save(`${receipt.receiptNumber}.pdf`);
      addToast('success', 'PDF ' + t('success'));
    } catch {
      addToast('error', 'PDF ' + t('error'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text = receiptToText(receipt, t);
    if (navigator.share) {
      navigator.share({ title: receipt.receiptNumber, text }).catch(() => {});
    } else {
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(text)}&text=${encodeURIComponent(receipt.receiptNumber)}`;
      window.open(telegramUrl, '_blank');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(receiptToText(receipt, t));
    addToast('success', t('copiedToClipboard'));
  };

  const handleDuplicate = () => {
    navigate('/receipts/create');
    // Store duplicate data in session
    sessionStorage.setItem('duplicate_receipt', JSON.stringify(receipt));
  };

  const handleCancel = () => {
    const updated = { ...receipt, cancelled: true };
    storage.updateReceipt(updated);
    refreshData();
    addToast('success', t('receiptCancelled'));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/history')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('receiptDetails')}</h2>
        {receipt.cancelled && <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-xs rounded-full">{t('cancelled')}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex justify-center">
          <div ref={printRef} className="print-area">
            <ReceiptPreview receipt={receipt} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('receiptNumber')}</span>
              <span className="font-mono">{receipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('date')}</span>
              <span>{formatDateTime(receipt.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('brands')}</span>
              <span>{receipt.brandSnapshot.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('subtotal')}</span>
              <span>{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>{t('discount')}</span>
                <span>-{formatCurrency(receipt.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
              <span>{t('total')}</span>
              <span className="text-blue-600">{formatCurrency(receipt.total)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-2">
              <span className="text-slate-500">{t('paymentType')}</span>
              <span>{t(receipt.payment.type as any)}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">{t('items')}</h4>
            <div className="space-y-2">
              {receipt.items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePdf} size="sm"><Download size={14} className="mr-1" />PDF</Button>
            <Button variant="secondary" onClick={handlePrint} size="sm"><Printer size={14} className="mr-1" />{t('print')}</Button>
            <Button variant="secondary" onClick={handleShare} size="sm"><Share2 size={14} className="mr-1" />Telegram</Button>
            <Button variant="secondary" onClick={handleCopy} size="sm"><Copy size={14} className="mr-1" />{t('copyText')}</Button>
            <Button variant="secondary" onClick={handleDuplicate} size="sm"><Copy size={14} className="mr-1" />{t('duplicate')}</Button>
            {!receipt.cancelled && (
              <Button variant="danger" onClick={() => setConfirmCancel(true)} size="sm"><X size={14} className="mr-1" />{t('cancelReceipt')}</Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog open={confirmCancel} onClose={() => setConfirmCancel(false)} onConfirm={handleCancel} title={t('confirmCancel')} message={t('confirmCancel')} />
    </div>
  );
}

// Statistics Page
function StatisticsPage() {
  const { t, receipts, brands } = useApp();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  const filtered = useMemo(() => {
    let list = receipts.filter(r => !r.cancelled);
    if (brandFilter) list = list.filter(r => r.brandId === brandFilter);
    if (dateFrom) list = list.filter(r => r.createdAt >= dateFrom);
    if (dateTo) list = list.filter(r => r.createdAt <= dateTo + 'T23:59:59');
    return list;
  }, [receipts, dateFrom, dateTo, brandFilter]);

  const totalSales = filtered.reduce((sum, r) => sum + r.total, 0);
  const avgReceipt = filtered.length > 0 ? totalSales / filtered.length : 0;

  const salesByBrand = brands.map(b => ({
    name: b.name,
    count: filtered.filter(r => r.brandId === b.id).length,
    total: filtered.filter(r => r.brandId === b.id).reduce((sum, r) => sum + r.total, 0),
  })).filter(b => b.count > 0);

  // Daily report
  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => {
      const day = r.createdAt.slice(0, 10);
      map[day] = (map[day] || 0) + r.total;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  }, [filtered]);

  const maxDaily = Math.max(...dailyData.map(d => d[1]), 1);

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('statistics')}</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" placeholder={t('from')} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" placeholder={t('to')} />
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
          <option value="">{t('allBrands')}</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title={t('totalReceipts')} value={filtered.length.toString()} icon={<ReceiptIcon size={20} />} color="blue" />
        <StatCard title={t('totalSales')} value={formatCurrency(totalSales)} icon={<BarChart3 size={20} />} color="green" />
        <StatCard title={t('avgReceipt')} value={formatCurrency(avgReceipt)} icon={<FileText size={20} />} color="purple" />
      </div>

      {/* Daily chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('dailyReport')}</h3>
        {dailyData.length === 0 ? (
          <p className="text-sm text-slate-500">{t('noData')}</p>
        ) : (
          <div className="space-y-2">
            {dailyData.map(([day, amount]) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20">{day.slice(5)}</span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2 transition-all" style={{ width: `${(amount / maxDaily) * 100}%` }}>
                    <span className="text-xs text-white font-medium">{formatCurrency(amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sales by brand */}
      {salesByBrand.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('salesByBrand')}</h3>
          <div className="space-y-3">
            {salesByBrand.map(b => (
              <div key={b.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.count} {t('totalReceipts').toLowerCase()}</p>
                </div>
                <span className="font-bold text-blue-600">{formatCurrency(b.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Page
function SettingsPage() {
  const { t, language, theme, setLanguage, setTheme, user } = useApp();
  const { addToast } = useToast();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');

  const handleChangePassword = () => {
    if (!currentPwd || !newPwd) { addToast('error', t('required')); return; }
    const users = storage.getUsers();
    const userIdx = users.findIndex(u => u.id === user!.id);
    if (userIdx < 0 || users[userIdx].passwordHash !== storage.hashPassword(currentPwd)) {
      addToast('error', t('wrongPassword'));
      return;
    }
    users[userIdx].passwordHash = storage.hashPassword(newPwd);
    storage.saveUsers(users);
    setCurrentPwd('');
    setNewPwd('');
    addToast('success', t('passwordChanged'));
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('settings')}</h2>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('profile')}</h3>
        <div className="text-sm">
          <p><span className="text-slate-500">{t('name')}:</span> {user?.name}</p>
          <p><span className="text-slate-500">{t('email')}:</span> {user?.email}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('language')}</h3>
        <div className="flex gap-2">
          {(['uz', 'ru', 'en'] as Language[]).map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${language === lang ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
              {lang === 'uz' ? "O'zbekcha" : lang === 'ru' ? 'Русский' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('theme')}</h3>
        <div className="flex gap-2">
          <button onClick={() => setTheme('light')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${theme === 'light' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
            <Sun size={16} /> {t('lightMode')}
          </button>
          <button onClick={() => setTheme('dark')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
            <Moon size={16} /> {t('darkMode')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('changePassword')}</h3>
        <Input label={t('currentPassword')} type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
        <Input label={t('newPassword')} type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
        <Button onClick={handleChangePassword}>{t('save')}</Button>
      </div>
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/auth" replace />;
  return <Layout>{children}</Layout>;
}

// Main App
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { user } = useApp();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/receipts/create" element={<ProtectedRoute><CreateReceiptPage /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><ReceiptHistoryPage /></ProtectedRoute>} />
      <Route path="/history/:id" element={<ProtectedRoute><ReceiptDetailPage /></ProtectedRoute>} />
      <Route path="/statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
      <Route path="/brands" element={<ProtectedRoute><BrandsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
