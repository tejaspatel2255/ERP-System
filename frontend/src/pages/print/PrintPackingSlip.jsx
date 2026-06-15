import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function PrintPackingSlip() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  useEffect(() => { axiosInstance.get(`/dispatch/packing-slips/${id}`).then((r) => setDoc(r.data)); }, [id]);
  const p = doc?.packingSlip;
  const items = doc?.items || [];
  return <div className="min-h-screen bg-white p-8 text-slate-900"><div className="no-print mb-4 flex justify-end"><button onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Print</button></div>{p && <div className="mx-auto max-w-4xl"><div className="flex justify-between border-b pb-4"><div><h1 className="text-2xl font-black">{import.meta.env.VITE_COMPANY_NAME || 'Company Name'}</h1><p className="text-sm">{import.meta.env.VITE_COMPANY_ADDRESS || 'Address'}</p></div><div className="text-right"><h2 className="text-xl font-bold">PACKING SLIP</h2><p>{p.packing_slip_no}</p><p>Date: {String(p.created_at).slice(0, 10)}</p><p>SO Ref: {p.sales_order_no}</p></div></div><table className="mt-6 w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2">Item</th><th>Batch No</th><th>Packed Qty</th><th>Unit</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b"><td className="py-2">{item.item_name}</td><td>{item.batch_no || '-'}</td><td>{item.qty}</td><td>{item.unit}</td></tr>)}</tbody></table></div>}</div>;
}
