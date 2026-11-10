import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Enterprise Table Component
 * @param {Array} columns - Array of { key, label, isMono, isNumeric, render(item, index) }
 * @param {Array} data - Array of records
 * @param {boolean} loading - Boolean loading indicator
 * @param {string} emptyMessage - Message when data is empty
 */
const Table = ({ columns, data = [], loading = false, emptyMessage = 'No records found' }) => {
  return (
    <div className="sheet overflow-x-auto w-full">
      <table className="bom min-w-[640px]">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={col.isNumeric ? 'text-right' : ''}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // Skeleton Loader Rows
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className="bom-row">
                {columns.map((_, cIdx) => (
                  <td key={cIdx}>
                    <div className="bg-bg-hover animate-pulse rounded h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty State Row
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-sm text-text-muted">
                <div className="flex flex-col items-center justify-center gap-2">
                  <AlertCircle size={24} className="stroke-[1.5] text-text-muted/70" />
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            // Data Rows
            data.map((item, rIdx) => (
              <tr
                key={item.id || rIdx}
                className="bom-row"
              >
                {columns.map((col, cIdx) => {
                  const val = item[col.key];
                  const isMono = col.isMono || (typeof val === 'string' && /^(PO|WO|SO|IN|INV|GRN|REQ|EMP|DOC|CH|QA|QC)-\d+/i.test(val));
                  return (
                    <td
                      key={col.key || cIdx}
                      className={`whitespace-nowrap ${
                        col.isNumeric ? 'text-right font-mono-tabular' : ''
                      } ${isMono ? 'font-mono-tabular text-accent-primary font-medium' : ''}`}
                    >
                      {col.render ? col.render(item, rIdx, rIdx) : (val ?? '—')}
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
