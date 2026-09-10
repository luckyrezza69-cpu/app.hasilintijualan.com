import React from 'react';
import { normalizeTableData, DynamicTableData } from './CustomTableBuilder';
import { cn } from '../../lib/utils';

interface CustomTableViewerProps {
  data: DynamicTableData | any[] | string;
  title?: string;
  className?: string;
  compact?: boolean;
  emptyMessage?: string;
}

export const CustomTableViewer: React.FC<CustomTableViewerProps> = ({
  data,
  title,
  className,
  compact = false,
  emptyMessage
}) => {
  const tableData = normalizeTableData(data);

  if (!tableData || tableData.columns.length === 0 || tableData.rows.length === 0) {
    if (emptyMessage) {
      return <p className="text-xs text-gray-400 italic">{emptyMessage}</p>;
    }
    return null;
  }

  // Check if all cells are completely empty
  const hasContent = tableData.rows.some(row => row.some(cell => cell && cell.trim() !== ''));
  if (!hasContent) {
    if (emptyMessage) {
      return <p className="text-xs text-gray-400 italic">{emptyMessage}</p>;
    }
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
      )}
      <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-teal-50/80 border-b border-gray-100 text-teal-900 font-bold">
              {tableData.columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={cn(
                    "font-bold uppercase tracking-wider whitespace-nowrap",
                    compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-xs",
                    idx === 0 ? "text-left" : "text-center"
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tableData.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50/60 transition-colors">
                {row.map((cell, colIdx) => (
                  <td 
                    key={colIdx} 
                    className={cn(
                      "text-gray-700 whitespace-nowrap",
                      compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs",
                      colIdx === 0 ? "font-bold text-gray-900 text-left" : "text-center"
                    )}
                  >
                    {cell || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
