import React, { useState } from 'react';
import PackingSlipsPage from './dispatch/PackingSlipsPage';
import DeliveryChallansPage from './dispatch/DeliveryChallansPage';
import DispatchSchedulePage from './dispatch/DispatchSchedulePage';
import PageHeader from '../components/PageHeader';

const tabs = [
  { key: 'packing', label: 'Packing Slips' },
  { key: 'challans', label: 'Delivery Challans' },
  { key: 'schedule', label: 'Dispatch Schedule' }
];

export default function DispatchPage() {
  const [activeTab, setActiveTab] = useState('packing');

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Dispatch & Logistics Operations"
        description="Generate packing slips, issue delivery challans, attach PODs, and track vehicle dispatch schedules."
      />

      {/* RECIPE-12 Tab Bar */}
      <div className="flex flex-wrap gap-1 border-b border-border-color pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn-sm transition-all ${
              activeTab === tab.key ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'packing' && <PackingSlipsPage />}
        {activeTab === 'challans' && <DeliveryChallansPage />}
        {activeTab === 'schedule' && <DispatchSchedulePage />}
      </div>
    </div>
  );
}
