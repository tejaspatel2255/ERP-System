import React, { useState } from 'react';
import EmployeesPage from './hr/EmployeesPage';
import AttendancePage from './hr/AttendancePage';
import LeavePage from './hr/LeavePage';
import SelfServicePage from './hr/SelfServicePage';
import TrainingPage from './hr/TrainingPage';

const tabs = [
  { key: 'employees', label: 'Employees' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave' },
  { key: 'self', label: 'Self Service' },
  { key: 'training', label: 'Training' }
];

export default function HrPage() {
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">HR Module</p>
            <h1 className="mt-1 text-3xl font-black">People operations and self service</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {activeTab === 'employees' && <EmployeesPage />}
      {activeTab === 'attendance' && <AttendancePage />}
      {activeTab === 'leave' && <LeavePage />}
      {activeTab === 'self' && <SelfServicePage />}
      {activeTab === 'training' && <TrainingPage />}
    </div>
  );
}
