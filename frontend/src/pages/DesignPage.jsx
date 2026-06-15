import React, { useState } from 'react';
import DesignFilesPage from './design/DesignFilesPage';
import DesignTasksPage from './design/DesignTasksPage';
import ReviewsPage from './design/ReviewsPage';

const tabs = [
  { key: 'files', label: 'Files' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'reviews', label: 'Reviews' }
];

export default function DesignPage() {
  const [activeTab, setActiveTab] = useState('files');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-teal-400">Design Module</p>
            <h1 className="mt-1 text-3xl font-black">Drawings, tasks, and review workflow</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-teal-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {activeTab === 'files' && <DesignFilesPage />}
      {activeTab === 'tasks' && <DesignTasksPage />}
      {activeTab === 'reviews' && <ReviewsPage />}
    </div>
  );
}
