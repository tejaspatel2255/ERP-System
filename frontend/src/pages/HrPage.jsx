import React, { useState } from 'react';
import EmployeesPage from './hr/EmployeesPage';
import AttendancePage from './hr/AttendancePage';
import LeavePage from './hr/LeavePage';
import SelfServicePage from './hr/SelfServicePage';
import TrainingPage from './hr/TrainingPage';
import PageHeader from '../components/PageHeader';

const tabs = [
  { key: 'employees', label: 'Employee Dossiers' },
  { key: 'attendance', label: 'Attendance Register' },
  { key: 'leave', label: 'Leave Applications' },
  { key: 'self', label: 'Employee Self Service' },
  { key: 'training', label: 'Skills & Training' }
];

export default function HrPage() {
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 animate-fadeIn">
      <PageHeader
        title="Human Resources & People Ops"
        description="Employee lifecycle, monthly attendance, leave balances, self service requests, and training certifications."
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
        {activeTab === 'employees' && <EmployeesPage />}
        {activeTab === 'attendance' && <AttendancePage />}
        {activeTab === 'leave' && <LeavePage />}
        {activeTab === 'self' && <SelfServicePage />}
        {activeTab === 'training' && <TrainingPage />}
      </div>
    </div>
  );
}
