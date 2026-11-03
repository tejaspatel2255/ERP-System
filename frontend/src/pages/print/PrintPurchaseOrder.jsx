import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { formatINR } from '../../utils/formatCurrency';
import { Printer } from 'lucide-react';

const env = import.meta.env;

export default function PrintPurchaseOrder() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    axiosInstance.get(`/purchase/orders/${id}`).then((r) => setDoc(r.data));
  }, [id]);

  const p = doc?.order;
  const items = doc?.items || [];

  return (
    <div
      className="min-h-screen bg-white p-6 sm:p-10 text-slate-900"
      style={{ fontFamily: "'IBM Plex Sans', Arial, sans-serif" }}
    >
      <div className="no-print mb-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="btn btn-primary no-print inline-flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" /> Print Document
        </button>
      </div>

      {p && (
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Document Header */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-5">
            <div className="flex items-start gap-3.5">
              <img
                src="/logo.png"
                alt="ERP Nexus Logo"
                className="h-12 w-12 rounded object-contain"
              />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#0F2744]">
                  {env.VITE_COMPANY_NAME || 'Company Name'}
                </h1>
                <p className="text-xs text-slate-600 max-w-sm mt-0.5">
                  {env.VITE_COMPANY_ADDRESS || 'Address'}
                </p>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  GSTIN: {env.VITE_COMPANY_GSTIN || 'N/A'}
                </p>
              </div>
            </div>

            {/* Document Details Box */}
            <div className="text-right border border-slate-300 rounded px-3.5 py-2.5 text-sm bg-slate-50/50">
              <h2 className="text-2xl font-semibold text-[#0F2744] leading-tight">
                Purchase Order
              </h2>
              <p className="font-mono font-medium text-slate-800 mt-1">
                {p.po_no}
              </p>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Date: {String(p.po_date).slice(0, 10)}
              </p>
              <p className="text-xs text-slate-600 font-mono">
                Expected: {String(p.expected_date).slice(0, 10)}
              </p>
            </div>
          </div>

          {/* Vendor Details */}
          <div className="text-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Vendor details
            </p>
            <p className="font-semibold text-slate-800 text-base">{p.vendor_name}</p>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-xs font-semibold text-slate-700 border-y border-slate-300">
                <th className="text-left py-2.5 px-3">Item Description</th>
                <th className="text-right py-2.5 px-3">Qty</th>
                <th className="text-right py-2.5 px-3">Unit Price</th>
                <th className="text-right py-2.5 px-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-2 px-3 font-medium text-slate-800">{item.item_name}</td>
                  <td className="text-right py-2 px-3 tabular-nums font-mono">{item.qty}</td>
                  <td className="text-right py-2 px-3 tabular-nums font-mono">{formatINR(item.unit_price)}</td>
                  <td className="text-right py-2 px-3 tabular-nums font-mono font-medium">{formatINR(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Block */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-1.5 text-right text-sm">
              <div className="flex justify-between items-baseline pt-2 border-t-2 border-slate-800 font-bold text-base text-[#0F2744]">
                <span>Total Order Value:</span>
                <span className="font-mono tabular-nums text-lg">{formatINR(p.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="pt-6 border-t border-slate-200 text-xs text-slate-500">
            <p className="font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Terms & conditions
            </p>
            <div className="whitespace-pre-line text-slate-600">
              {p.notes || env.VITE_PO_TERMS || 'Terms apply.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
