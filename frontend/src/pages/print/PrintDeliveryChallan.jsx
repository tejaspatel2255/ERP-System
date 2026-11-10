import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { formatDate } from '../../utils/formatDate';
import { Printer, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const env = import.meta.env;

const COMPANY_NAME = env.VITE_COMPANY_NAME || 'ERP Nexus Enterprise Ltd.';
const COMPANY_ADDRESS = env.VITE_COMPANY_ADDRESS || '123 Industrial Area, Phase II, New Delhi - 110020, India';
const COMPANY_GSTIN = env.VITE_COMPANY_GSTIN || '07AAAAA1111A1Z0';
const COMPANY_PAN = 'AAAAA1111A';
const COMPANY_STATE = 'Delhi (07)';

const formatQty = (qty) => {
  const num = parseFloat(qty) || 0;
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

export default function PrintDeliveryChallan() {
  const { id } = useParams();
  const { isLoading: authLoading } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChallan = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/dispatch/challans/${id}`);
      if (res.data?.success) {
        setDoc(res.data);
      } else {
        setError(res.data?.message || 'Delivery challan not found.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load delivery challan document.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) {
      fetchChallan();
    }
  }, [authLoading, fetchChallan]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading Delivery Challan document...</p>
      </div>
    );
  }

  if (error || !doc?.challan) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="bg-white border border-slate-300 rounded-lg p-6 max-w-md w-full shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Failed to load delivery challan</h3>
            <p className="text-xs text-slate-500 mt-1">{error || 'Delivery challan not found or access denied.'}</p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Link to="/dispatch/challans" className="btn btn-secondary btn-sm inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Challans
            </Link>
            <button onClick={fetchChallan} className="btn btn-primary btn-sm inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const c = doc.challan;
  const items = doc.items || [];
  const transport = doc.transport || null;
  const pod = doc.pod || null;
  const totalQty = items.reduce((sum, it) => sum + (parseFloat(it.qty) || 0), 0);

  return (
    <div
      className="min-h-screen bg-slate-100/60 p-4 sm:p-8 text-slate-900 print:bg-white print:p-0"
      style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif" }}
    >
      {/* Top Action Bar (Hidden on print) */}
      <div className="no-print max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
        <Link
          to="/dispatch/challans"
          className="btn btn-ghost btn-sm inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Delivery Challans
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Document / Save PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="printable-document max-w-4xl mx-auto bg-white border border-slate-300 rounded-lg p-6 sm:p-10 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 border-slate-800 gap-4">
          <div className="flex items-start gap-3.5">
            <img
              src="/logo.svg"
              alt="ERP Nexus Logo"
              className="h-12 w-12 object-contain rounded mt-0.5"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">{COMPANY_NAME}</h1>
              <p className="text-xs text-slate-600 mt-0.5 max-w-md leading-relaxed">{COMPANY_ADDRESS}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1 font-mono">
                <span><strong className="text-slate-800 font-sans font-medium">GSTIN:</strong> {COMPANY_GSTIN}</span>
                <span><strong className="text-slate-800 font-sans font-medium">PAN:</strong> {COMPANY_PAN}</span>
                <span><strong className="text-slate-800 font-sans font-medium">State:</strong> {COMPANY_STATE}</span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right border-2 border-slate-800 rounded bg-slate-50 px-3.5 py-2.5 text-xs min-w-[230px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Official Dispatch / Transit
            </div>
            <div className="text-base font-bold text-slate-900 tracking-tight">
              DELIVERY CHALLAN
            </div>
            <div className="mt-2 pt-2 border-t border-slate-300 space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Challan No:</span>
                <span className="font-mono font-bold text-slate-900">{c.challan_no}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Challan Date:</span>
                <span className="font-mono text-slate-800">{formatDate(c.challan_date)}</span>
              </div>
              {c.packing_slip_no && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Packing Slip:</span>
                  <span className="font-mono text-slate-800">{c.packing_slip_no}</span>
                </div>
              )}
              {c.sales_order_no && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Sales Order:</span>
                  <span className="font-mono text-blue-700 font-semibold">{c.sales_order_no}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Consignee & Logistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Consignee Card */}
          <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
              Consignee / Deliver To
            </div>
            <div className="space-y-1 text-xs text-slate-700">
              <p className="font-bold text-slate-900 text-sm">{c.customer_name}</p>
              {c.customer_address && (
                <p className="whitespace-pre-line leading-relaxed text-slate-600">
                  {c.customer_address}
                </p>
              )}
              <div className="pt-1 space-y-0.5 font-mono text-[11px] text-slate-600">
                <p><strong className="font-sans font-medium text-slate-700">GSTIN:</strong> {c.customer_gstin || 'Unregistered / N/A'}</p>
                {c.customer_email && (
                  <p><strong className="font-sans font-medium text-slate-700">Email:</strong> {c.customer_email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Transport Particulars Card */}
          <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1 mb-2">
              Transport & Logistics Particulars
            </div>
            {transport ? (
              <div className="space-y-1 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Transporter:</span>
                  <span className="font-semibold text-slate-900">{transport.transporter_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle Number:</span>
                  <span className="font-mono font-semibold text-slate-900">{transport.vehicle_no || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">LR / Docket No:</span>
                  <span className="font-mono text-slate-900">{transport.lr_number || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dispatch Date:</span>
                  <span className="font-mono text-slate-800">{formatDate(transport.dispatch_date)}</span>
                </div>
                {pod?.received_by && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-emerald-700 font-medium">
                    <span>Delivered To:</span>
                    <span>{pod.received_by} ({formatDate(pod.delivered_at)})</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400 italic">
                Transport & vehicle allocation pending dispatch confirmation
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                <th className="p-2.5 border border-slate-300 w-10 text-center">#</th>
                <th className="p-2.5 border border-slate-300 w-28">Item Code</th>
                <th className="p-2.5 border border-slate-300">Item Description</th>
                <th className="p-2.5 border border-slate-300 w-32">Batch / Lot No</th>
                <th className="p-2.5 border border-slate-300 w-28 text-right">Dispatched Qty</th>
                <th className="p-2.5 border border-slate-300 w-20 text-center">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-slate-700">
              {items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50">
                  <td className="p-2.5 border border-slate-300 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                  <td className="p-2.5 border border-slate-300 font-mono font-medium text-slate-900">{item.item_code || '—'}</td>
                  <td className="p-2.5 border border-slate-300 font-medium text-slate-900">{item.item_name}</td>
                  <td className="p-2.5 border border-slate-300 font-mono text-xs">{item.batch_no || '—'}</td>
                  <td className="p-2.5 border border-slate-300 text-right font-bold font-mono text-slate-900 tabular-nums">
                    {formatQty(item.qty)}
                  </td>
                  <td className="p-2.5 border border-slate-300 text-center text-slate-600">{item.unit || 'Units'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                <td colSpan={4} className="p-2.5 border border-slate-300 text-right uppercase tracking-wider text-[11px] text-slate-600">
                  Total Quantity Dispatched:
                </td>
                <td className="p-2.5 border border-slate-300 text-right font-mono text-sm tabular-nums text-blue-700">
                  {formatQty(totalQty)}
                </td>
                <td className="p-2.5 border border-slate-300 text-center text-xs text-slate-600">
                  {items[0]?.unit || 'Units'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Statutory Note & Dual Signatures */}
        <div className="pt-2 space-y-6">
          <div className="p-3 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Dispatch Declaration:</strong> This Delivery Challan is issued under relevant GST transit rules for delivery/transport of goods. The receiver acknowledges that goods described above have been checked and received intact in good condition.
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8">
            <div className="text-left border-t border-slate-400 pt-2">
              <p className="text-xs font-semibold text-slate-800">Receiver's Signature & Company Stamp</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Name, Date & Contact Number</p>
            </div>
            <div className="text-right border-t border-slate-400 pt-2">
              <p className="text-xs font-semibold text-slate-800">For {COMPANY_NAME}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Authorized Dispatch Signatory / Warehouse In-Charge</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
