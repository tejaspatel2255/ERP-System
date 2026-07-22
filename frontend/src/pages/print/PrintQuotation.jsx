import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { formatINR } from '../../utils/formatCurrency';

export default function PrintQuotation() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  useEffect(() => { axiosInstance.get(`/sales/quotations/${id}`).then((r) => setDoc(r.data)); }, [id]);
  const q = doc?.quotation;
  const items = doc?.items || [];
  return (
    <div className="min-h-screen bg-white p-8 text-slate-900">
      <div className="no-print mb-4 flex justify-end">
        <button onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Print</button>
      </div>
      {q && (
        <div className="mx-auto max-w-4xl">
          <div className="flex justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-black">{import.meta.env.VITE_COMPANY_NAME || 'Company Name'}</h1>
              <p className="text-sm">{import.meta.env.VITE_COMPANY_ADDRESS || 'Address'}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">COMMERCIAL QUOTATION</h2>
              <p>{q.quotation_no}</p>
              <p>Date: {String(q.date).slice(0, 10)}</p>
              <p>Valid Until: {String(q.valid_until).slice(0, 10)}</p>
            </div>
          </div>
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b"><th className="text-left py-2">Item</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Tax</th><th>Total</th></tr>
            </thead>
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
            <p className="text-lg text-blue-900">Grand Total: {formatINR(q.total_amount)}</p>
          </div>
          <div className="mt-6 text-sm whitespace-pre-line">
            {import.meta.env.VITE_QUOTATION_TERMS || q.notes || 'Terms apply.'}
          </div>
        </div>
      )}
    </div>
  );
}
