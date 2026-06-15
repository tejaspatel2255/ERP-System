import React, { useState } from 'react';
import PackingSlipsPage from './dispatch/PackingSlipsPage';
import DeliveryChallansPage from './dispatch/DeliveryChallansPage';
import DispatchSchedulePage from './dispatch/DispatchSchedulePage';

const tabs = [
  { key: 'packing', label: 'Packing Slips' },
  { key: 'challans', label: 'Delivery Challans' },
  { key: 'schedule', label: 'Schedule' }
];

export default function DispatchPage() {
  const [activeTab, setActiveTab] = useState('packing');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Dispatch Module</p>
            <h1 className="mt-1 text-3xl font-black">Packing, challans, and dispatch tracking</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {activeTab === 'packing' && <PackingSlipsPage />}
      {activeTab === 'challans' && <DeliveryChallansPage />}
      {activeTab === 'schedule' && <DispatchSchedulePage />}
    </div>
  );
}
