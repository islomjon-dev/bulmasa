import React, { useRef, useEffect, useState } from 'react';
import { Receipt } from '../types';
import { useApp } from './ui';
import { formatCurrency, formatDateTime } from '../utils/storage';
import QRCode from 'qrcode';

interface Props {
  receipt: Receipt;
  template?: 'classic' | 'modern' | 'minimal';
}

export default function ReceiptPreview({ receipt, template }: Props) {
  const { t } = useApp();
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const tmpl = template || receipt.template;
  const brand = receipt.brandSnapshot;

  useEffect(() => {
    const qrContent = receipt.id;
    QRCode.toDataURL(qrContent, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then((url: string) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [receipt.id]);

  if (tmpl === 'modern') return <ModernTemplate receipt={receipt} brand={brand} qrDataUrl={qrDataUrl} t={t} />;
  if (tmpl === 'minimal') return <MinimalTemplate receipt={receipt} brand={brand} qrDataUrl={qrDataUrl} t={t} />;
  return <ClassicTemplate receipt={receipt} brand={brand} qrDataUrl={qrDataUrl} t={t} />;
}

function ClassicTemplate({ receipt, brand, qrDataUrl, t }: { receipt: Receipt; brand: any; qrDataUrl: string; t: (k: any) => string }) {
  return (
    <div className="receipt-paper rounded-lg p-6 max-w-sm mx-auto" style={{ fontFamily: "'Courier New', monospace" }}>
      <div className="text-center mb-4">
        {brand.logo && <img src={brand.logo} alt="" className="w-16 h-16 mx-auto mb-2 object-contain" />}
        <h2 className="text-lg font-bold" style={{ color: brand.primaryColor }}>{brand.name}</h2>
        {brand.address && <p className="text-xs text-slate-500">{brand.address}</p>}
        {brand.phone && <p className="text-xs text-slate-500">{brand.phone}</p>}
      </div>
      
      <div className="border-t border-b border-dashed border-slate-300 dark:border-slate-600 py-2 mb-3">
        <div className="flex justify-between text-xs">
          <span>{t('receiptNumber')}:</span>
          <span className="font-mono">{receipt.receiptNumber}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span>{t('date')}:</span>
          <span>{formatDateTime(receipt.createdAt)}</span>
        </div>
      </div>

      <div className="mb-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-300 dark:border-slate-600">
              <th className="text-left py-1 font-semibold">{t('items')}</th>
              <th className="text-center py-1 font-semibold">{t('quantity')}</th>
              <th className="text-right py-1 font-semibold">{t('price')}</th>
              <th className="text-right py-1 font-semibold">{t('total')}</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map(item => (
              <tr key={item.id} className="border-b border-dotted border-slate-200 dark:border-slate-700">
                <td className="py-1 text-left">{item.name}</td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="py-1 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>{t('subtotal')}:</span>
          <span>{formatCurrency(receipt.subtotal)}</span>
        </div>
        {receipt.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>{t('discount')}:</span>
            <span>-{formatCurrency(receipt.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-slate-300 dark:border-slate-600 pt-1">
          <span>{t('total')}:</span>
          <span>{formatCurrency(receipt.total)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 dark:border-slate-600 mt-3 pt-2 text-xs">
        <div className="flex justify-between">
          <span>{t('paymentType')}:</span>
          <span>{t(receipt.payment.type as any)}</span>
        </div>
        {receipt.payment.type === 'mixed' && (
          <>
            <div className="flex justify-between">
              <span>{t('cash')}:</span>
              <span>{formatCurrency(receipt.payment.cashAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('card')}:</span>
              <span>{formatCurrency(receipt.payment.cardAmount)}</span>
            </div>
          </>
        )}
      </div>

      {qrDataUrl && (
        <div className="flex justify-center mt-4">
          <img src={qrDataUrl} alt="QR" className="w-24 h-24" />
        </div>
      )}

      <div className="text-center mt-4 text-xs text-slate-500">
        <p>{brand.footerText || t('thankYou')}</p>
      </div>

      {receipt.cancelled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-red-600 text-2xl font-bold rotate-[-15deg] border-4 border-red-600 px-4 py-1">
            {t('cancelled')}
          </span>
        </div>
      )}
    </div>
  );
}

function ModernTemplate({ receipt, brand, qrDataUrl, t }: { receipt: Receipt; brand: any; qrDataUrl: string; t: (k: any) => string }) {
  return (
    <div className="receipt-paper rounded-xl p-6 max-w-sm mx-auto border-t-4" style={{ borderColor: brand.primaryColor }}>
      <div className="flex items-center gap-3 mb-4">
        {brand.logo && <img src={brand.logo} alt="" className="w-12 h-12 rounded-lg object-contain" />}
        <div>
          <h2 className="text-lg font-bold" style={{ color: brand.primaryColor }}>{brand.name}</h2>
          <p className="text-xs text-slate-500">{receipt.receiptNumber}</p>
        </div>
      </div>

      <div className="text-xs text-slate-500 mb-4">
        <p>{formatDateTime(receipt.createdAt)}</p>
        {brand.address && <p>{brand.address}</p>}
      </div>

      <div className="space-y-2 mb-4">
        {receipt.items.map(item => (
          <div key={item.id} className="flex justify-between items-start py-2 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
              <p className="text-xs text-slate-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(item.lineTotal)}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">{t('subtotal')}</span>
          <span>{formatCurrency(receipt.subtotal)}</span>
        </div>
        {receipt.discount > 0 && (
          <div className="flex justify-between text-xs text-red-500">
            <span>{t('discount')}</span>
            <span>-{formatCurrency(receipt.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200 dark:border-slate-600">
          <span>{t('total')}</span>
          <span style={{ color: brand.primaryColor }}>{formatCurrency(receipt.total)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-xs">
          <p className="text-slate-500">{t('paymentType')}</p>
          <p className="font-medium">{t(receipt.payment.type as any)}</p>
        </div>
        {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-16 h-16" />}
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">{brand.footerText || t('thankYou')}</p>
    </div>
  );
}

function MinimalTemplate({ receipt, brand, qrDataUrl, t }: { receipt: Receipt; brand: any; qrDataUrl: string; t: (k: any) => string }) {
  return (
    <div className="receipt-paper rounded-lg p-6 max-w-xs mx-auto">
      <h2 className="text-center text-base font-bold mb-1" style={{ color: brand.primaryColor }}>{brand.name}</h2>
      <p className="text-center text-xs text-slate-400 mb-4">{receipt.receiptNumber} • {formatDateTime(receipt.createdAt)}</p>

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {receipt.items.map(item => (
          <div key={item.id} className="flex justify-between py-2 text-xs">
            <span className="flex-1">{item.name} <span className="text-slate-400">×{item.quantity}</span></span>
            <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
        {receipt.discount > 0 && (
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t('subtotal')}</span>
            <span>{formatCurrency(receipt.subtotal)}</span>
          </div>
        )}
        {receipt.discount > 0 && (
          <div className="flex justify-between text-xs text-red-500">
            <span>-{t('discount')}</span>
            <span>{formatCurrency(receipt.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold mt-1">
          <span>{t('total')}</span>
          <span>{formatCurrency(receipt.total)}</span>
        </div>
      </div>

      {qrDataUrl && (
        <div className="flex justify-center mt-4">
          <img src={qrDataUrl} alt="QR" className="w-20 h-20" />
        </div>
      )}

      <p className="text-center text-xs text-slate-400 mt-3">{brand.footerText || t('thankYou')}</p>
    </div>
  );
}

// Export receipt as text
export function receiptToText(receipt: Receipt, t: (k: any) => string): string {
  const brand = receipt.brandSnapshot;
  let text = `${brand.name}\n`;
  if (brand.address) text += `${brand.address}\n`;
  if (brand.phone) text += `${brand.phone}\n`;
  text += `\n${t('receiptNumber')}: ${receipt.receiptNumber}\n`;
  text += `${t('date')}: ${formatDateTime(receipt.createdAt)}\n`;
  text += '─'.repeat(30) + '\n';
  
  receipt.items.forEach(item => {
    text += `${item.name}\n`;
    text += `  ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.lineTotal)}\n`;
  });
  
  text += '─'.repeat(30) + '\n';
  text += `${t('subtotal')}: ${formatCurrency(receipt.subtotal)}\n`;
  if (receipt.discount > 0) text += `${t('discount')}: -${formatCurrency(receipt.discount)}\n`;
  text += `${t('total')}: ${formatCurrency(receipt.total)}\n`;
  text += `${t('paymentType')}: ${t(receipt.payment.type as any)}\n`;
  text += `\n${brand.footerText || t('thankYou')}`;
  
  return text;
}
