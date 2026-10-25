import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Industrial BOM-style Data-Grid Table Component
 * @param {Array} columns - Array of { key, label, isMono, isNumeric, render(item, index) }
 * @param {Array} data - Array of records
 * @param {boolean} loading - Boolean loading indicator
 * @param {string} emptyMessage - Message when data is empty
 */
const Table = ({ columns, data = [], loading = false, emptyMessage = 'No telemetry or records available' }) => {
  return (
    <div className="sheet overflow-x-auto">
      <table className="bom">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={col.isNumeric ? 'text-right' : 'text-left'}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-color font-sans text-sm">
          {loading ? (
            // Industrial Skeleton Loader Rows
            Array.from({ length: 5 }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-4 py-3.5">
                    <div className="h-4 bg-bg-hover rounded-none w-2/3" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Tactical Empty State Row
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border-color p-8 text-text-muted">
                  <AlertCircle size={22} className="stroke-[1.5] text-text-muted/60" />
                  <span className="font-mono text-xs tracking-tight uppercase">
                    {emptyMessage || 'NO ENTRIES ON THIS SHEET'}
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            // Data Rows
            data.map((item, rIdx) => (
              <tr
                key={item.id || rIdx}
                className="bom-row group"
              >
                {columns.map((col, cIdx) => {
                  const val = item[col.key];
                  const isMono = col.isMono || (typeof val === 'string' && /^(PO|WO|SO|IN|INV|GRN|REQ|EMP|DOC|CH|QA|QC|MCH)-\d+/i.test(val));

                  let content;
                  if (col.render) {
                    content = col.render(item, rIdx);
                  } else if (isMono && val) {
                    content = <span className="stamp">{val}</span>;
                  } else {
                    content = val;
                  }

                  return (
                    <td
                      key={col.key || cIdx}
                      className={`px-4 py-3 text-sm text-text-primary whitespace-nowrap ${
                        col.isNumeric ? 'text-right font-mono-tabular font-semibold' : ''
                      }`}
                    >
                      {content}
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
