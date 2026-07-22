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
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Design & Engineering Module"
        description="CAD drawings repository, design tasks coordination, and version approval workflows."
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
        {activeTab === 'files' && <DesignFilesPage />}
        {activeTab === 'tasks' && <DesignTasksPage />}
        {activeTab === 'reviews' && <ReviewsPage />}
      </div>
    </div>
  );
}
