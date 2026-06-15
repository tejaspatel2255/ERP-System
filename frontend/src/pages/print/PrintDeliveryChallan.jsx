import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

export default function PrintDeliveryChallan() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  useEffect(() => { axiosInstance.get(`/dispatch/challans/${id}`).then((r) => setDoc(r.data)); }, [id]);
  const c = doc?.challan;
  const items = doc?.items || [];
  return <div className="min-h-screen bg-white p-8 text-slate-900"><div className="no-print mb-4 flex justify-end"><button onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Print</button></div>{c && <div className="mx-auto max-w-4xl"><div className="flex justify-between border-b pb-4"><div><h1 className="text-2xl font-black">{import.meta.env.VITE_COMPANY_NAME || 'Company Name'}</h1><p className="text-sm">{import.meta.env.VITE_COMPANY_ADDRESS || 'Address'}</p></div><div className="text-right"><h2 className="text-xl font-bold">DELIVERY CHALLAN</h2><p>{c.challan_no}</p><p>Date: {String(c.challan_date).slice(0, 10)}</p></div></div><div className="mt-4 text-sm"><p className="font-bold">Customer: {c.customer_name}</p></div><table className="mt-6 w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2">Item</th><th>Batch No</th><th>Qty</th><th>Unit</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b"><td className="py-2">{item.item_name}</td><td>{item.batch_no || '-'}</td><td>{item.qty}</td><td>{item.unit}</td></tr>)}</tbody></table><div className="mt-6 grid gap-4 md:grid-cols-2 text-sm"><div><p className="font-bold">Transporter</p><p>{doc?.transport?.transporter_name || '-'}</p><p>Vehicle: {doc?.transport?.vehicle_no || '-'}</p></div><div className="text-right"><p>LR No: {doc?.transport?.lr_number || '-'}</p></div></div><div className="mt-10 grid grid-cols-2 gap-8 text-sm"><div className="border-t pt-2">Dispatched By</div><div className="border-t pt-2 text-right">Received By</div></div></div>}</div>;
}
