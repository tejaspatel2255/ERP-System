import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function PrintPurchaseOrder() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  useEffect(() => { axiosInstance.get(`/purchase/orders/${id}`).then((r) => setDoc(r.data)); }, [id]);
  const p = doc?.order;
  const items = doc?.items || [];
  return <div className="min-h-screen bg-white p-8 text-slate-900"><div className="no-print mb-4 flex justify-end"><button onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Print</button></div>{p && <div className="mx-auto max-w-4xl"><div className="flex justify-between border-b pb-4"><div><h1 className="text-2xl font-black">{import.meta.env.VITE_COMPANY_NAME || 'Company Name'}</h1><p className="text-sm">{import.meta.env.VITE_COMPANY_ADDRESS || 'Address'}</p></div><div className="text-right"><h2 className="text-xl font-bold">PURCHASE ORDER</h2><p>{p.po_no}</p><p>Date: {String(p.po_date).slice(0, 10)}</p><p>Expected: {String(p.expected_date).slice(0, 10)}</p></div></div><div className="mt-4 text-sm"><p className="font-bold">Vendor: {p.vendor_name}</p></div><table className="mt-6 w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2">Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b"><td className="py-2">{item.item_name}</td><td>{item.qty}</td><td>{item.unit_price}</td><td>{item.line_total}</td></tr>)}</tbody></table><div className="mt-6 text-sm whitespace-pre-line">{p.notes || import.meta.env.VITE_PO_TERMS || 'Terms apply.'}</div></div>}</div>;
}
