import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function PrintDeliveryChallan() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);

  useEffect(() => { 
    axiosInstance.get(`/dispatch/challans/${id}`).then((r) => setDoc(r.data)); 
  }, [id]);

  const c = doc?.challan;
  const items = doc?.items || [];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 text-slate-900 font-sans print:p-0 print:bg-white">
      <div className="no-print mb-6 max-w-4xl mx-auto flex justify-between items-center bg-white p-4 rounded-xs border border-slate-300 shadow-2xs">
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">
          Document Preview: Delivery Challan (DC)
        </span>
        <button 
          onClick={() => window.print()} 
          className="btn btn-primary text-xs font-mono uppercase px-4 py-1.5"
        >
          🖨️ Print Challan
        </button>
      </div>

      {c && (
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
                <p className="text-xs text-slate-600 font-mono font-bold mt-0.5">GSTIN: {import.meta.env.VITE_COMPANY_GSTIN || '27AAAAA0000A1Z5'}</p>
              </div>
            </div>

            <div className="text-right font-mono">
              <h2 className="text-lg font-black uppercase tracking-wider text-blue-900">DELIVERY CHALLAN</h2>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{c.challan_no}</p>
              <p className="text-xs text-slate-600 mt-1">Date: {String(c.challan_date).slice(0, 10)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xs border border-slate-200 text-xs font-mono">
            <div>
              <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Consignee / Destination</h3>
              <p className="font-bold text-slate-900 text-sm mt-1">{c.customer_name}</p>
              <p className="text-slate-600 mt-0.5">{c.customer_address || 'Address on file'}</p>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Dispatch Reference</h3>
              <p className="text-slate-800 mt-1">Status: <span className="font-bold uppercase text-blue-900">{c.status}</span></p>
            </div>
          </div>

          <table className="mt-6 w-full text-left border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-mono font-bold border-b border-slate-300">
                <th className="p-2.5 border border-slate-300">Item Description</th>
                <th className="p-2.5 border border-slate-300 font-mono">Batch No</th>
                <th className="p-2.5 border border-slate-300 text-center font-mono">Qty</th>
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

          <div className="mt-6 grid gap-6 md:grid-cols-2 text-xs font-mono bg-slate-50 p-4 rounded-xs border border-slate-200">
            <div>
              <p className="font-bold uppercase text-slate-700 mb-1">Carrier Details</p>
              <p className="text-slate-600">Transporter: {doc?.transport?.transporter_name || 'Standard Logistics'}</p>
              <p className="text-slate-600">Vehicle No: {doc?.transport?.vehicle_no || '—'}</p>
            </div>
            <div className="text-right">
              <p className="font-bold uppercase text-slate-700 mb-1">Logistics Ref</p>
              <p className="text-slate-600">LR / Docket: {doc?.transport?.lr_number || '—'}</p>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8 text-xs font-mono pt-6">
            <div className="border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-700">Dispatched By</p>
              <p className="text-[10px] text-slate-500 mt-1">Authorized Warehouse Officer</p>
            </div>
            <div className="border-t border-slate-400 pt-2 text-right">
              <p className="font-bold text-slate-700">Received By</p>
              <p className="text-[10px] text-slate-500 mt-1">Customer / Carrier Signature & Stamp</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
