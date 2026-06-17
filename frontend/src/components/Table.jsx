import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable Table Component
 * @param {Array} columns - Array of { key, label, render(item, index) }
 * @param {Array} data - Array of records
 * @param {boolean} loading - Boolean loading indicator
 * @param {string} emptyMessage - Message when data is empty
 */
const Table = ({ columns, data = [], loading = false, emptyMessage = 'No data available' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border-color bg-bg-card shadow-brand transition-all duration-300">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-color bg-bg-secondary">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color">
          {loading ? (
            // Skeleton Loader Rows
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse bg-bg-card">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-6 py-4">
                    <div className="h-4 bg-bg-hover rounded w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty State Row
            <tr className="bg-bg-card">
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-text-muted">
                  <AlertCircle size={28} className="stroke-[1.5]" />
                  <span className="text-sm font-medium">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            // Data Rows
            data.map((item, rIdx) => (
              <tr
                key={item.id || rIdx}
                className="bg-bg-card hover:bg-bg-hover transition-colors duration-200"
              >
                {columns.map((col, cIdx) => (
                  <td
                    key={col.key || cIdx}
                    className="px-6 py-4 text-sm font-medium text-text-primary whitespace-nowrap"
                  >
                    {col.render ? col.render(item, rIdx) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
