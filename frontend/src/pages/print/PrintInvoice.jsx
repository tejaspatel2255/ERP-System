import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { formatINR } from '../../utils/formatCurrency';

const env = import.meta.env;

export default function PrintInvoice() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);

  useEffect(() => { 
    axiosInstance.get(`/sales/invoices/${id}`).then((r) => setDoc(r.data)); 
  }, [id]);

  const invoice = doc?.invoice;
  const items = doc?.items || [];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 text-slate-900 font-sans print:p-0 print:bg-white">
      <div className="no-print mb-6 max-w-4xl mx-auto flex justify-between items-center bg-white p-4 rounded-xs border border-slate-300 shadow-2xs">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
          Document Preview: Tax Invoice
        </span>
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()} 
            className="btn btn-primary text-xs font-mono uppercase px-4 py-1.5"
          >
            🖨️ Print Document
          </button>
        </div>
      </div>

      {invoice && (
        <div className="mx-auto max-w-4xl bg-white p-8 rounded-xs border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-6">
          {invoice.status === 'Paid' && (
            <div className="mb-4 text-center text-5xl font-black uppercase tracking-widest text-emerald-600/20 font-mono select-none">
              PAID
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between border-b-2 border-slate-800 pb-5 items-start">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xs border border-slate-800 bg-slate-900 text-white flex items-center justify-center font-black font-mono text-xl">
                EN
              </div>
              <div>
                <h1 className="text-xl font-black font-mono uppercase tracking-wider text-slate-950">
                  {env.VITE_COMPANY_NAME || 'ERP ENTERPRISE'}
                </h1>
                <p className="text-xs text-slate-600 font-mono mt-0.5">{env.VITE_COMPANY_ADDRESS || 'Industrial Estate, Phase II'}</p>
                <p className="text-xs text-slate-600 font-mono font-bold mt-0.5">GSTIN: {env.VITE_COMPANY_GSTIN || '27AAAAA0000A1Z5'}</p>
              </div>
            </div>

            <div className="text-right font-mono">
              <h2 className="text-lg font-black uppercase tracking-wider text-blue-900">TAX INVOICE</h2>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{invoice.invoice_no}</p>
              <p className="text-xs text-slate-600 mt-1">Date: {String(invoice.invoice_date).slice(0, 10)}</p>
              <p className="text-xs text-slate-600">Due: {String(invoice.due_date).slice(0, 10)}</p>
            </div>
          </div>

          {/* Billing & Order Details */}
          <div className="mt-5 grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xs border border-slate-200 text-xs font-mono">
            <div>
              <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Billed To</h3>
              <p className="font-bold text-slate-900 text-sm mt-1">{invoice.customer_name}</p>
              <p className="text-slate-600 mt-0.5">{invoice.customer_address || 'Address on file'}</p>
              <p className="text-slate-600 font-bold mt-1">GSTIN: {invoice.customer_gstin || 'Unregistered'}</p>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Reference Orders</h3>
              <p className="text-slate-800 mt-1"><span className="text-slate-500">Order Ref:</span> <span className="font-bold">{invoice.order_no}</span></p>
              <p className="text-slate-800"><span className="text-slate-500">Payment Status:</span> <span className="font-bold uppercase">{invoice.status}</span></p>
            </div>
          </div>

          {/* Table Items */}
          <table className="mt-6 w-full text-left border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-mono font-bold border-b border-slate-300">
                <th className="p-2.5 border border-slate-300">Item Description</th>
                <th className="p-2.5 border border-slate-300 text-center font-mono">Qty</th>
                <th className="p-2.5 border border-slate-300 text-right font-mono">Unit Price</th>
                <th className="p-2.5 border border-slate-300 text-right font-mono">Discount</th>
                <th className="p-2.5 border border-slate-300 text-right font-mono">Tax</th>
                <th className="p-2.5 border border-slate-300 text-right font-mono">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-mono">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2.5 border border-slate-300 font-sans font-medium text-slate-900">
                    <div>{item.item_name}</div>
                    {item.item_code && <div className="text-[10px] text-slate-500 font-mono">{item.item_code}</div>}
                  </td>
                  <td className="p-2.5 border border-slate-300 text-center">{item.qty}</td>
                  <td className="p-2.5 border border-slate-300 text-right">{formatINR(item.unit_price)}</td>
                  <td className="p-2.5 border border-slate-300 text-right">{formatINR(item.discount || 0)}</td>
                  <td className="p-2.5 border border-slate-300 text-right">{item.tax_pct || 0}%</td>
                  <td className="p-2.5 border border-slate-300 text-right font-bold text-slate-900">{formatINR(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-5 flex justify-end font-mono">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-bold text-slate-800">{formatINR(invoice.subtotal || invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm font-bold border-b-2 border-slate-800 text-blue-900">
                <span>Grand Total:</span>
                <span>{formatINR(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Bank Info */}
          <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-6 text-[11px] font-mono text-slate-600">
            <div>
              <p className="font-bold uppercase text-slate-800 mb-1">Terms & Conditions</p>
              <p className="whitespace-pre-line">{env.VITE_INVOICE_TERMS || invoice.notes || 'Payment is due within payment period. Goods once sold are not returnable.'}</p>
            </div>
            <div className="text-right">
              <p className="font-bold uppercase text-slate-800 mb-1">Bank Payment Details</p>
              <p>{env.VITE_BANK_NAME || 'Industrial Bank of Commerce'}</p>
              <p>A/C: {env.VITE_BANK_ACCOUNT_NO || '99018274612984'}</p>
              <p>IFSC: {env.VITE_BANK_IFSC || 'IBC0001092'}</p>
            </div>
          </div>

          <div className="mt-12 flex justify-between items-end pt-6 border-t border-slate-300 text-xs">
            <p className="text-[10px] text-slate-400 font-mono">Generated via ERP Enterprise Drawing System</p>
            <div className="text-center border-t border-slate-500 pt-1.5 w-48">
              <p className="font-mono font-bold text-xs uppercase tracking-wider text-slate-800">Authorized Signatory</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
