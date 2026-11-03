import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { Printer } from 'lucide-react';

const env = import.meta.env;

export default function PrintDeliveryChallan() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    axiosInstance.get(`/dispatch/challans/${id}`).then((r) => setDoc(r.data));
  }, [id]);

  const c = doc?.challan;
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

      {c && (
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
                Delivery Challan
              </h2>
              <p className="font-mono font-medium text-slate-800 mt-1">
                {c.challan_no}
              </p>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Date: {String(c.challan_date).slice(0, 10)}
              </p>
            </div>
          </div>

          {/* Consignee Details */}
          <div className="text-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Consignee details
            </p>
            <p className="font-semibold text-slate-800 text-base">{c.customer_name}</p>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-xs font-semibold text-slate-700 border-y border-slate-300">
                <th className="text-left py-2.5 px-3">Item Description</th>
                <th className="text-left py-2.5 px-3">Batch Number</th>
                <th className="text-right py-2.5 px-3">Dispatched Qty</th>
                <th className="text-left py-2.5 px-3">Unit</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-2 px-3 font-medium text-slate-800">{item.item_name}</td>
                  <td className="py-2 px-3 font-mono text-xs text-slate-600">{item.batch_no || '-'}</td>
                  <td className="text-right py-2 px-3 tabular-nums font-mono font-medium">{item.qty}</td>
                  <td className="py-2 px-3 text-slate-600 text-xs">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Logistics & Transporter Details */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Logistics transporter
              </p>
              <p className="font-medium text-slate-800">{doc?.transport?.transporter_name || '-'}</p>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                Vehicle No: {doc?.transport?.vehicle_no || '-'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Docket reference
              </p>
              <p className="font-mono text-xs text-slate-700">
                LR / Bilty No: {doc?.transport?.lr_number || '-'}
              </p>
            </div>
          </div>

          {/* Signature Boxes */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-xs text-slate-600">
            <div className="border-t border-slate-400 pt-2 text-left">
              <p className="font-semibold text-slate-700">Dispatched by</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Authorised Signatory</p>
            </div>
            <div className="border-t border-slate-400 pt-2 text-right">
              <p className="font-semibold text-slate-700">Received in good condition</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Receiver Stamp & Signature</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
