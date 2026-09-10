import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DynamicTableData {
  title?: string;
  columns: string[];
  rows: string[][];
}

interface CustomTableBuilderProps {
  value?: DynamicTableData | any[] | string;
  onChange: (data: DynamicTableData) => void;
  className?: string;
  onTotalQtyChange?: (total: number) => void;
}

// Preset definitions for fast 1-click generation
export const TABLE_PRESETS = [
  {
    id: 'tshirt_standard',
    name: 'Standar Baju / Kaos',
    description: 'Ukuran, Panjang, Lebar Dada, Lengan, Qty',
    data: {
      columns: ['Ukuran', 'Panjang (cm)', 'Lebar Dada (cm)', 'Lengan (cm)', 'Jumlah (Pcs)'],
      rows: [
        ['S', '68', '48', '21', ''],
        ['M', '70', '50', '22', ''],
        ['L', '72', '52', '23', ''],
        ['XL', '74', '54', '24', ''],
        ['XXL', '76', '56', '25', ''],
      ]
    }
  },
  {
    id: 'size_qty_only',
    name: 'Ukuran & Jumlah Saja',
    description: 'S, M, L, XL, XXL x Jumlah Pcs',
    data: {
      columns: ['Ukuran', 'Jumlah (Pcs)', 'Keterangan'],
      rows: [
        ['S', '', ''],
        ['M', '', ''],
        ['L', '', ''],
        ['XL', '', ''],
        ['XXL', '', ''],
      ]
    }
  },
  {
    id: 'color_size_matrix',
    name: 'Matriks Warna & Ukuran',
    description: 'Warna x S, M, L, XL, XXL',
    data: {
      columns: ['Varian Warna', 'S', 'M', 'L', 'XL', 'XXL', 'Total'],
      rows: [
        ['Hitam', '', '', '', '', '', ''],
        ['Putih', '', '', '', '', '', ''],
        ['Navy', '', '', '', '', '', ''],
      ]
    }
  },
  {
    id: 'pants_standard',
    name: 'Standar Celana',
    description: 'Ukuran, Panjang, Lingkar Pinggang, Paha, Qty',
    data: {
      columns: ['Ukuran', 'Panjang (cm)', 'Lingkar Pinggang (cm)', 'Lingkar Paha (cm)', 'Jumlah (Pcs)'],
      rows: [
        ['28', '98', '72', '56', ''],
        ['30', '100', '76', '58', ''],
        ['32', '102', '80', '60', ''],
        ['34', '104', '84', '62', ''],
      ]
    }
  }
];

// Helper to normalize any incoming value into DynamicTableData
export const normalizeTableData = (raw: any): DynamicTableData => {
  if (!raw) {
    return {
      columns: ['Ukuran', 'Panjang (cm)', 'Lebar Dada (cm)', 'Lengan (cm)', 'Jumlah (Pcs)'],
      rows: [
        ['S', '', '', '', ''],
        ['M', '', '', '', ''],
        ['L', '', '', '', ''],
        ['XL', '', '', '', ''],
        ['XXL', '', '', '', ''],
      ]
    };
  }

  // If already in DynamicTableData format
  if (typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.columns) && Array.isArray(raw.rows)) {
    return {
      columns: raw.columns.length > 0 ? raw.columns : ['Kolom 1'],
      rows: raw.rows.map((r: any) => Array.isArray(r) ? r : Object.values(r).map(String))
    };
  }

  // If string, parse first
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return normalizeTableData(parsed);
    } catch (e) {
      return normalizeTableData(null);
    }
  }

  // If legacy array of objects: [{ size: 'S', panjang: '', dada: '', lengan: '', pcsWarna: '' }]
  if (Array.isArray(raw)) {
    if (raw.length === 0) return normalizeTableData(null);
    const first = raw[0];
    if (typeof first === 'object' && first !== null) {
      // Map standard legacy keys to nice column names
      const keyMap: Record<string, string> = {
        size: 'Ukuran',
        panjang: 'Panjang (cm)',
        dada: 'Lebar Dada (cm)',
        lengan: 'Lengan (cm)',
        pcswarna: 'Jumlah (Pcs)',
        pcs: 'Jumlah (Pcs)',
        qty: 'Jumlah (Pcs)',
        notes: 'Catatan'
      };

      const keys = Object.keys(first);
      const columns = keys.map(k => keyMap[k.toLowerCase()] || k);
      const rows = raw.map(item => keys.map(k => String(item[k] ?? '')));
      return { columns, rows };
    }
  }

  return normalizeTableData(null);
};

export const CustomTableBuilder: React.FC<CustomTableBuilderProps> = ({
  value,
  onChange,
  className,
  onTotalQtyChange
}) => {
  const [tableData, setTableData] = useState<DynamicTableData>(() => normalizeTableData(value));

  useEffect(() => {
    setTableData(normalizeTableData(value));
  }, [value]);

  const updateTable = (newData: DynamicTableData) => {
    setTableData(newData);
    onChange(newData);

    // Auto calculate total if callback provided
    if (onTotalQtyChange) {
      let sum = 0;
      newData.rows.forEach(row => {
        row.forEach(cell => {
          const num = parseFloat(cell);
          if (!isNaN(num) && num > 0) {
            sum += num;
          }
        });
      });
      onTotalQtyChange(sum);
    }
  };

  // 1. Column Actions
  const handleColumnNameChange = (colIndex: number, newName: string) => {
    const newCols = [...tableData.columns];
    newCols[colIndex] = newName;
    updateTable({ ...tableData, columns: newCols });
  };

  const handleAddColumn = () => {
    const colNumber = tableData.columns.length + 1;
    const newCols = [...tableData.columns, `Kolom ${colNumber}`];
    const newRows = tableData.rows.map(row => [...row, '']);
    updateTable({ ...tableData, columns: newCols, rows: newRows });
  };

  const handleDeleteColumn = (colIndex: number) => {
    if (tableData.columns.length <= 1) {
      alert('Tabel minimal harus memiliki 1 kolom.');
      return;
    }
    const newCols = tableData.columns.filter((_, idx) => idx !== colIndex);
    const newRows = tableData.rows.map(row => row.filter((_, idx) => idx !== colIndex));
    updateTable({ ...tableData, columns: newCols, rows: newRows });
  };

  // 2. Row Actions
  const handleCellChange = (rowIndex: number, colIndex: number, cellValue: string) => {
    const newRows = tableData.rows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        const newRow = [...row];
        newRow[colIndex] = cellValue;
        return newRow;
      }
      return row;
    });
    updateTable({ ...tableData, rows: newRows });
  };

  const handleAddRow = () => {
    const emptyRow = new Array(tableData.columns.length).fill('');
    updateTable({ ...tableData, rows: [...tableData.rows, emptyRow] });
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (tableData.rows.length <= 1) {
      alert('Tabel minimal harus memiliki 1 baris.');
      return;
    }
    const newRows = tableData.rows.filter((_, idx) => idx !== rowIndex);
    updateTable({ ...tableData, rows: newRows });
  };

  // 3. Preset Applicator
  const applyPreset = (presetId: string) => {
    const preset = TABLE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      updateTable({
        columns: [...preset.data.columns],
        rows: preset.data.rows.map(r => [...r])
      });
    }
  };

  const handleResetEmpty = () => {
    updateTable({
      columns: ['Ukuran / Tipe', 'Jumlah (Pcs)'],
      rows: [
        ['', ''],
        ['', '']
      ]
    });
  };

  return (
    <div className={cn("space-y-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm", className)}>
      {/* Header controls & Preset Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pb-3 border-b border-gray-100">
        <div>
          <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-teal-600" />
            Tabel Ukuran & Rincian Jumlah (Kustom)
          </label>
          <p className="text-[11px] text-gray-500">
            Atur nama kolom (lebar) dan baris (tinggi) secara bebas sesuai pesanan.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <select 
            onChange={(e) => {
              if (e.target.value) {
                applyPreset(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-1.5 px-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
          >
            <option value="" disabled>⚡ Pilih Template Preset...</option>
            {TABLE_PRESETS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleResetEmpty}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Reset Tabel Kosong"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Dynamic Table Matrix Container */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl max-w-full">
        <table className="w-full text-xs text-left border-collapse min-w-[400px]">
          {/* Editable Column Headers */}
          <thead>
            <tr className="bg-teal-50/70 border-b border-gray-200">
              <th className="p-2 text-center text-gray-400 font-bold w-10 border-r border-gray-200">
                #
              </th>
              {tableData.columns.map((colName, colIdx) => (
                <th key={colIdx} className="p-1.5 border-r border-gray-200 last:border-r-0 min-w-[110px]">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={colName}
                      onChange={(e) => handleColumnNameChange(colIdx, e.target.value)}
                      placeholder={`Nama Kolom ${colIdx + 1}`}
                      className="w-full font-bold text-gray-800 bg-white/80 focus:bg-white px-2 py-1 rounded border border-transparent hover:border-gray-300 focus:border-teal-500 outline-none text-xs transition-colors"
                    />
                    {tableData.columns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(colIdx)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors hover:bg-red-50 flex-shrink-0 cursor-pointer"
                        title="Hapus Kolom"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-1.5 w-12 text-center bg-teal-50">
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="w-full py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                  title="Tambah Kolom Baru (Lebar)"
                >
                  <Plus size={13} />
                </button>
              </th>
            </tr>
          </thead>

          {/* Editable Cell Rows */}
          <tbody className="divide-y divide-gray-100">
            {tableData.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-2 text-center font-bold text-gray-400 border-r border-gray-200 bg-gray-50/30">
                  {rowIdx + 1}
                </td>
                {row.map((cellValue, colIdx) => (
                  <td key={colIdx} className="p-1 border-r border-gray-100 last:border-r-0">
                    <input
                      type="text"
                      value={cellValue}
                      onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                      placeholder="..."
                      className="w-full p-1.5 bg-white border border-gray-200 rounded focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none text-xs text-gray-800 font-medium transition-all"
                    />
                  </td>
                ))}
                <td className="p-1 text-center bg-gray-50/20">
                  {tableData.rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(rowIdx)}
                      className="text-gray-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      title="Hapus Baris Ini"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Row Actions & Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} className="text-teal-600" />
            <span>Tambah Baris (+ Baris)</span>
          </button>
          <button
            type="button"
            onClick={handleAddColumn}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={14} className="text-teal-600" />
            <span>Tambah Kolom (+ Kolom)</span>
          </button>
        </div>

        <div className="text-gray-500 text-[11px] font-medium">
          Ukuran Tabel: <span className="font-bold text-teal-700">{tableData.columns.length} Kolom</span> × <span className="font-bold text-teal-700">{tableData.rows.length} Baris</span>
        </div>
      </div>
    </div>
  );
};
