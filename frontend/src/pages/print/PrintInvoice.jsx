import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { formatINR } from '../../utils/formatCurrency';

const env = import.meta.env;

export default function PrintInvoice() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);

  useEffect(() => { axiosInstance.get(`/sales/invoices/${id}`).then((r) => setDoc(r.data)); }, [id]);

  const invoice = doc?.invoice;
  const items = doc?.items || [];

  return (
    <div className="min-h-screen bg-white p-8 text-slate-900">
      <div className="no-print mb-4 flex justify-end">
        <button onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Print</button>
      </div>
      {invoice && (
        <div className="mx-auto max-w-4xl">
          {invoice.status === 'Paid' && <div className="mb-4 text-center text-5xl font-black uppercase text-slate-200">Paid</div>}
          <div className="flex justify-between border-b pb-4 items-center">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="ERP Nexus Logo" className="h-12 w-12 rounded-xl object-contain shadow-xs" />
              <div>
                <h1 className="text-2xl font-black">{env.VITE_COMPANY_NAME || 'Hina Industries'}</h1>
                <p className="text-sm">{env.VITE_COMPANY_ADDRESS || 'Address'}</p>
                <p className="text-sm">GSTIN: {env.VITE_COMPANY_GSTIN || 'N/A'}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">INVOICE</h2>
              <p>{invoice.invoice_no}</p>
              <p>Date: {String(invoice.invoice_date).slice(0, 10)}</p>
              <p>Due: {String(invoice.due_date).slice(0, 10)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div><h3 className="font-bold">Bill To</h3><p>{invoice.customer_name}</p></div>
            <div className="text-right"><p>Order Ref: {invoice.order_no}</p></div>
          </div>
          <table className="mt-6 w-full text-sm">
            <thead><tr className="border-b"><th className="text-left py-2">Item</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Tax</th><th>Total</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.item_name}</td>
                  <td className="text-center">{item.qty}</td>
                  <td>{formatINR(item.unit_price)}</td>
                  <td>{formatINR(item.discount || 0)}</td>
                  <td>{item.tax_pct || 0}%</td>
                  <td>{formatINR(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 text-right text-sm font-bold">
            <p>Subtotal: {formatINR(invoice.subtotal || invoice.total_amount)}</p>
            <p className="text-lg mt-1 text-blue-900">Grand Total: {formatINR(invoice.total_amount)}</p>
          </div>
          <div className="mt-6 text-sm">
            <p>{env.VITE_INVOICE_TERMS || 'Payment terms apply.'}</p>
            <p>{env.VITE_BANK_NAME || ''} {env.VITE_BANK_ACCOUNT_NO || ''} {env.VITE_BANK_IFSC || ''}</p>
          </div>
        </div>
      )}
    </div>
  );
}
