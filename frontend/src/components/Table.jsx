import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Reusable Industrial Table Component
 * @param {Array} columns - Array of { key, label, isMono, isNumeric, render(item, index) }
 * @param {Array} data - Array of records
 * @param {boolean} loading - Boolean loading indicator
 * @param {string} emptyMessage - Message when data is empty
 */
const Table = ({ columns, data = [], loading = false, emptyMessage = 'No data available' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border-color bg-bg-secondary shadow-sm transition-colors duration-200">
      <table className="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-border-color bg-slate-100/70 dark:bg-slate-900/80">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary select-none ${
                  col.isNumeric ? 'text-right' : ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color/60 bg-bg-secondary">
          {loading ? (
            // Skeleton Loader Rows
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-5 py-4">
                    <div className="h-3.5 bg-bg-hover/80 rounded-lg w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty State Row
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-text-muted">
                  <AlertCircle size={28} className="stroke-[1.5] text-text-muted/70" />
                  <span className="text-sm font-medium">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            // Data Rows
            data.map((item, rIdx) => (
              <tr
                key={item.id || rIdx}
                className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors duration-150 group"
              >
                {columns.map((col, cIdx) => {
                  const val = item[col.key];
                  const isMono = col.isMono || (typeof val === 'string' && /^(PO|WO|SO|IN|INV|GRN|REQ|EMP|DOC|CH|QA|QC)-\d+/i.test(val));
                  return (
                    <td
                      key={col.key || cIdx}
                      className={`px-5 py-3.5 text-sm font-medium text-text-primary whitespace-nowrap ${
                        col.isNumeric ? 'text-right font-mono-tabular' : ''
                      } ${isMono ? 'font-mono-tabular text-accent-primary font-semibold' : ''}`}
                    >
                      {col.render ? col.render(item, rIdx) : (val ?? '—')}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
