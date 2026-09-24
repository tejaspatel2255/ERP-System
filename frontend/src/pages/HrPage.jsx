import React, { useState } from 'react';
import EmployeesPage from './hr/EmployeesPage';
import AttendancePage from './hr/AttendancePage';
import LeavePage from './hr/LeavePage';
import SelfServicePage from './hr/SelfServicePage';
import TrainingPage from './hr/TrainingPage';
import PageHeader from '../components/PageHeader';

const tabs = [
  { key: 'employees', label: 'Employee Directory' },
  { key: 'attendance', label: 'Attendance Register' },
  { key: 'leave', label: 'Leave Applications' },
  { key: 'self', label: 'Employee Self Service' },
  { key: 'training', label: 'Skills & Training' }
];

export default function HrPage() {
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-300">
      <PageHeader
        title="Human Resources & People Ops"
        description="Employee lifecycle, monthly attendance, leave balances, self service requests, and training certifications."
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
        {activeTab === 'employees' && <EmployeesPage />}
        {activeTab === 'attendance' && <AttendancePage />}
        {activeTab === 'leave' && <LeavePage />}
        {activeTab === 'self' && <SelfServicePage />}
        {activeTab === 'training' && <TrainingPage />}
      </div>
    </div>
  );
}
