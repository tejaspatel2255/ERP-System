import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Industrial Data-Grid Table Component
 * @param {Array} columns - Array of { key, label, isMono, isNumeric, render(item, index) }
 * @param {Array} data - Array of records
 * @param {boolean} loading - Boolean loading indicator
 * @param {string} emptyMessage - Message when data is empty
 */
const Table = ({ columns, data = [], loading = false, emptyMessage = 'No telemetry or records available' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-sm border border-border-color bg-bg-secondary shadow-2xs transition-colors duration-150">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border-color bg-bg-card/90">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted select-none ${
                  col.isNumeric ? 'text-right' : ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color/60 bg-bg-secondary font-sans text-xs">
          {loading ? (
            // Industrial Skeleton Loader Rows
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-4 py-3">
                    <div className="h-3.5 bg-bg-hover rounded-xs w-2/3" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Tactical Empty State Row
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center justify-center gap-1.5 text-text-muted">
                  <AlertCircle size={22} className="stroke-[1.5] text-text-muted/60" />
                  <span className="text-xs font-mono tracking-tight">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            // Data Rows
            data.map((item, rIdx) => (
              <tr
                key={item.id || rIdx}
                className="hover:bg-bg-hover/80 transition-colors duration-100 group"
              >
                {columns.map((col, cIdx) => {
                  const val = item[col.key];
                  const isMono = col.isMono || (typeof val === 'string' && /^(PO|WO|SO|IN|INV|GRN|REQ|EMP|DOC|CH|QA|QC|MCH)-\d+/i.test(val));
                  return (
                    <td
                      key={col.key || cIdx}
                      className={`px-4 py-2.5 text-xs text-text-primary whitespace-nowrap ${
                        col.isNumeric ? 'text-right font-mono-tabular font-semibold' : ''
                      } ${isMono ? 'font-mono-tabular text-accent-primary font-bold' : ''}`}
                    >
                      {col.render ? col.render(item, rIdx) : val}
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
