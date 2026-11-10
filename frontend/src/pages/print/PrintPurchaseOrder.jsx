import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { formatINR } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { Printer, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const env = import.meta.env;

const COMPANY_NAME = env.VITE_COMPANY_NAME || 'ERP Nexus Enterprise Ltd.';
const COMPANY_ADDRESS = env.VITE_COMPANY_ADDRESS || '123 Industrial Area, Phase II, New Delhi - 110020, India';
const COMPANY_GSTIN = env.VITE_COMPANY_GSTIN || '07AAAAA1111A1Z0';

const numberToIndianWords = (num) => {
  const n = Math.round(parseFloat(num) || 0);
  if (n === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanThousand = (val) => {
    let str = '';
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + ' ';
      val %= 10;
    }
    if (val > 0) {
      str += a[val] + ' ';
    }
    return str.trim();
  };

  let words = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore > 0) words += convertLessThanThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder > 0) words += convertLessThanThousand(remainder) + ' ';

  return (words.trim() ? words.trim() + ' Rupees Only' : 'Zero Rupees Only');
};

export default function PrintPurchaseOrder() {
  const { id } = useParams();
  const { isLoading: authLoading } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPO = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/purchase/orders/${id}`);
      if (res.data?.success) {
        setDoc(res.data);
      } else {
        setError(res.data?.message || 'Purchase order not found.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load purchase order document.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) {
      fetchPO();
    }
  }, [authLoading, fetchPO]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading Purchase Order document...</p>
      </div>
    );
  }

  if (error || !doc?.order) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="bg-white border border-slate-300 rounded-lg p-6 max-w-md w-full shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Failed to load purchase order</h3>
            <p className="text-xs text-slate-500 mt-1">{error || 'Purchase order not found or access denied.'}</p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={fetchPO}
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
            <Link to="/purchase/orders" className="btn btn-ghost btn-sm inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Purchase Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const p = doc.order;
  const items = doc.items || [];
  const totalAmount = parseFloat(p?.total_amount) || 0;

  return (
    <div
      className="min-h-screen bg-white p-4 sm:p-8 text-slate-900 print:p-0"
      style={{ fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="no-print mb-6 max-w-4xl mx-auto flex justify-between items-center bg-slate-100 p-3 rounded border border-slate-200">
        <span className="text-xs font-medium text-slate-600">Print Preview Mode (A4 Optimized)</span>
        <button
          onClick={() => window.print()}
          className="btn btn-primary no-print inline-flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      <div className="printable-document mx-auto max-w-4xl bg-white border border-slate-300 rounded-lg p-6 sm:p-8 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-5 border-b-2 border-slate-800 gap-4">
          <div className="flex items-start gap-3.5">
            <img
              src="/logo.svg"
              alt="ERP Nexus Logo"
              className="h-12 w-12 object-contain rounded mt-0.5"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                {COMPANY_NAME}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5 max-w-md leading-relaxed">
                {COMPANY_ADDRESS}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1 font-mono">
                <span><strong className="text-slate-800 font-sans font-medium">GSTIN:</strong> {COMPANY_GSTIN}</span>
                <span><strong className="text-slate-800 font-sans font-medium">PAN:</strong> AAAAA1111A</span>
                <span><strong className="text-slate-800 font-sans font-medium">State:</strong> Delhi (07)</span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right border-2 border-slate-800 rounded bg-slate-50 px-3.5 py-2.5 text-xs min-w-[220px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Official Procurement
            </div>
            <div className="text-base font-bold text-slate-900 tracking-tight">
              PURCHASE ORDER
            </div>
            <div className="mt-2 pt-2 border-t border-slate-300 space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">PO No:</span>
                <span className="font-mono font-bold text-slate-900">{p.po_no}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">PO Date:</span>
                <span className="font-mono text-slate-800">{String(p.po_date).slice(0, 10)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Delivery Due:</span>
                <span className="font-mono font-semibold text-blue-700">{String(p.expected_date).slice(0, 10)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Approval:</span>
                <span className={`font-semibold uppercase ${p.approval_status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {p.approval_status || 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor & Delivery details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 text-xs">
          <div className="border border-slate-300 rounded p-3 bg-slate-50/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
              Supplier / Vendor Details (Issued To)
            </div>
            <div className="pt-2">
              <p className="text-sm font-bold text-slate-900">{p.vendor_name}</p>
              <p className="text-slate-600 mt-1 leading-relaxed">{p.vendor_address || 'Address on file'}</p>
              <div className="mt-2 space-y-0.5 font-mono text-slate-600">
                <p><span className="text-slate-500 font-sans">GSTIN:</span> <strong className="text-slate-800">{p.vendor_gstin || 'Unregistered / NA'}</strong></p>
                {p.vendor_email && (
                  <p><span className="text-slate-500 font-sans">Email:</span> {p.vendor_email}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border border-slate-300 rounded p-3 bg-slate-50/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-200">
              Delivery & Warehouse Destination (Ship To)
            </div>
            <div className="pt-2 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Location:</span>
                <span className="font-medium text-slate-800">Central Storage Warehouse</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Due:</span>
                <span className="font-medium text-slate-800">{String(p.expected_date).slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Terms:</span>
                <span className="font-medium text-slate-800">Standard Net 30 Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currency:</span>
                <span className="font-medium text-slate-800">Indian Rupee (INR - ₹)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line items Table */}
        <div className="my-5 overflow-x-auto border border-slate-300 rounded">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th className="py-2 px-2 text-center w-8 border-r border-slate-300">#</th>
                <th className="py-2 px-3 text-left border-r border-slate-300">Item Description & Specification</th>
                <th className="py-2 px-2 text-center w-16 border-r border-slate-300">HSN</th>
                <th className="py-2 px-2 text-center w-14 border-r border-slate-300">Quantity</th>
                <th className="py-2 px-3 text-right w-24 border-r border-slate-300">Unit Rate (₹)</th>
                <th className="py-2 px-3 text-right w-28">Line Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2 px-2 text-center text-slate-500 font-mono border-r border-slate-200">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-200">
                    <div className="font-bold text-slate-900">{item.item_name}</div>
                    {item.item_code && (
                      <div className="text-[11px] font-mono text-slate-500">Code: {item.item_code}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-slate-600 border-r border-slate-200">
                    {item.hsn_code || '8412'}
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-medium text-slate-800 border-r border-slate-200">{parseFloat(item.qty)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-800 border-r border-slate-200">{formatINR(item.unit_price)}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Notes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 pt-1">
          <div className="space-y-3 text-xs">
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                Total Order Value (in words):
              </span>
              <p className="font-medium text-slate-800 italic">
                {numberToIndianWords(totalAmount)}
              </p>
            </div>

            <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                Purchase & Delivery Instructions:
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {p.notes || env.VITE_PO_TERMS || 'Goods subject to mandatory inward quality inspection at receiving dock. Materials must match approved drawings and technical specifications.'}
              </p>
            </div>
          </div>

          <div className="border border-slate-300 rounded overflow-hidden text-xs self-start">
            <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 border-b border-slate-300 uppercase tracking-wider text-[10px]">
              Order Value Summary
            </div>
            <div className="p-3 space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Net):</span>
                <span className="font-mono">{formatINR(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST / Taxes:</span>
                <span className="font-mono text-slate-500">As applicable</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-slate-800 text-sm font-bold text-slate-900 bg-slate-50 -mx-3 -mb-3 p-3">
                <span className="uppercase tracking-tight">Total Order Value:</span>
                <span className="font-mono text-base text-blue-700">{formatINR(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Signatures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 mt-3 border-t border-slate-300 text-xs">
          <div className="text-slate-600 space-y-1">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Standard Purchase Conditions:</h4>
            <p className="whitespace-pre-line leading-relaxed text-[11px]">
              1. Please send two copies of invoice with original delivery challan.
              2. Inward stock is subject to warehouse QC clearance before receipt confirmation.
              3. Delivery must be executed on or before the specified expected date.
            </p>
          </div>

          <div className="text-left sm:text-right flex flex-col justify-between items-start sm:items-end min-h-[80px]">
            <div className="text-slate-700 font-bold uppercase text-[11px]">
              For {COMPANY_NAME}
            </div>
            <div className="w-48 border-t border-slate-400 pt-1 text-center mt-6">
              <p className="font-semibold text-slate-800">{p.approver_name || 'Authorized Signatory'}</p>
              <p className="text-[10px] text-slate-500">Procurement & Material Management</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
