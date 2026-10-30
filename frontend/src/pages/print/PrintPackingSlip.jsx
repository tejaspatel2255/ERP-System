import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function PrintPackingSlip() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);

  useEffect(() => { 
    axiosInstance.get(`/dispatch/packing-slips/${id}`).then((r) => setDoc(r.data)); 
  }, [id]);

  const p = doc?.packingSlip;
  const items = doc?.items || [];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 text-slate-900 font-sans print:p-0 print:bg-white">
      <div className="no-print mb-6 max-w-4xl mx-auto flex justify-between items-center bg-white p-4 rounded-xs border border-slate-300 shadow-2xs">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
          Document Preview: Packing Slip (PS)
        </span>
        <button 
          onClick={() => window.print()} 
          className="btn btn-primary text-xs font-mono uppercase px-4 py-1.5"
        >
          🖨️ Print Packing Slip
        </button>
      </div>

      {p && (
        <div className="mx-auto max-w-4xl bg-white p-8 rounded-xs border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-6">
          <div className="flex justify-between border-b-2 border-slate-800 pb-5 items-start">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xs border border-slate-800 bg-slate-900 text-white flex items-center justify-center font-black font-mono text-xl">
                EN
              </div>
              <div>
                <h1 className="text-xl font-black font-mono uppercase tracking-wider text-slate-950">
                  {import.meta.env.VITE_COMPANY_NAME || 'ERP ENTERPRISE'}
                </h1>
                <p className="text-xs text-slate-600 font-mono mt-0.5">{import.meta.env.VITE_COMPANY_ADDRESS || 'Industrial Estate, Phase II'}</p>
              </div>
            </div>

            <div className="text-right font-mono">
              <h2 className="text-lg font-black uppercase tracking-wider text-blue-900">PACKING SLIP</h2>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{p.packing_slip_no}</p>
              <p className="text-xs text-slate-600 mt-1">Date: {String(p.created_at).slice(0, 10)}</p>
              <p className="text-xs text-slate-600">SO Ref: {p.sales_order_no}</p>
            </div>
          </div>

          <div className="mt-5 bg-slate-50 p-4 rounded-xs border border-slate-200 text-xs font-mono">
            <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Customer / Consignee</h3>
            <p className="font-bold text-slate-900 text-sm mt-1">{p.customer_name || 'Destination on Sales Order'}</p>
          </div>

          <table className="mt-6 w-full text-left border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-mono font-bold border-b border-slate-300">
                <th className="p-2.5 border border-slate-300">Item Description</th>
                <th className="p-2.5 border border-slate-300 font-mono">Batch No</th>
                <th className="p-2.5 border border-slate-300 text-center font-mono">Packed Qty</th>
                <th className="p-2.5 border border-slate-300 text-center font-mono">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-mono">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2.5 border border-slate-300 font-sans font-medium text-slate-900">{item.item_name}</td>
                  <td className="p-2.5 border border-slate-300 text-slate-600">{item.batch_no || '—'}</td>
                  <td className="p-2.5 border border-slate-300 text-center font-bold text-slate-900">{item.qty}</td>
                  <td className="p-2.5 border border-slate-300 text-center text-slate-600">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {p.notes && (
            <div className="mt-6 pt-4 border-t border-slate-300 text-[11px] font-mono text-slate-600">
              <p className="font-bold uppercase text-slate-800 mb-1">Packaging Instructions</p>
              <p>{p.notes}</p>
            </div>
          )}

          <div className="mt-12 flex justify-between items-end pt-6 border-t border-slate-300 text-xs">
            <p className="text-[10px] text-slate-400 font-mono">Generated via ERP Enterprise Drawing System</p>
            <div className="text-center border-t border-slate-500 pt-1.5 w-48">
              <p className="font-mono font-bold text-xs uppercase tracking-wider text-slate-800">Packed By & Checked</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
