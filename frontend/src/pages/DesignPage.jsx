import React, { useState } from 'react';
import DesignFilesPage from './design/DesignFilesPage';
import DesignTasksPage from './design/DesignTasksPage';
import ReviewsPage from './design/ReviewsPage';
import PageHeader from '../components/PageHeader';

const tabs = [
  { key: 'files', label: 'Files & Drawings' },
  { key: 'tasks', label: 'Design Tasks' },
  { key: 'reviews', label: 'Engineering Reviews' }
];

export default function DesignPage() {
  const [activeTab, setActiveTab] = useState('files');

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Design & Engineering Module"
        description="CAD drawings repository, design tasks coordination, and version approval workflows."
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
        {activeTab === 'files' && <DesignFilesPage />}
        {activeTab === 'tasks' && <DesignTasksPage />}
        {activeTab === 'reviews' && <ReviewsPage />}
      </div>
    </div>
  );
}
