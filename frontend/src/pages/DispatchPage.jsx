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
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Dispatch & Logistics Operations"
        description="Generate packing slips, issue delivery challans, attach PODs, and track vehicle dispatch schedules."
        actions={
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-accent-primary text-white shadow-sm'
                    : 'border border-border-color bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-6">
        {activeTab === 'packing' && <PackingSlipsPage />}
        {activeTab === 'challans' && <DeliveryChallansPage />}
        {activeTab === 'schedule' && <DispatchSchedulePage />}
      </div>
    </div>
  );
}
