import * as XLSX from 'xlsx';

export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  rawRows: any[][];
  suggestedTarget: 'Orders' | 'SPK_Produksi' | 'Customers' | 'Inventory_Bahan' | 'Inventory_Produk_Jadi' | 'QC_Reports';
  detectedItems: Record<string, any>[];
}

export interface ParseResult {
  fileName: string;
  fileType: 'excel' | 'word' | 'csv' | 'text';
  sheets: ParsedSheet[];
  error?: string;
}

/**
 * Smart detection of target ERP module based on column headers or sheet name
 */
function detectTargetModule(headers: string[], sheetName = ''): 'Orders' | 'SPK_Produksi' | 'Customers' | 'Inventory_Bahan' | 'Inventory_Produk_Jadi' | 'QC_Reports' {
  const text = (headers.join(' ') + ' ' + sheetName).toLowerCase();
  
  if (text.includes('cutting') || text.includes('sewing') || text.includes('finishing') || text.includes('spk') || text.includes('operator')) {
    return 'SPK_Produksi';
  }
  if (text.includes('defect') || text.includes('reject') || text.includes('qc') || text.includes('kualitas')) {
    return 'QC_Reports';
  }
  if (text.includes('kain') || text.includes('bahan baku') || text.includes('roll') || text.includes('benang') || text.includes('rib')) {
    return 'Inventory_Bahan';
  }
  if (text.includes('produk jadi') || text.includes('stok kaos') || text.includes('ready stock')) {
    return 'Inventory_Produk_Jadi';
  }
  if (text.includes('telepon') || text.includes('alamat') || text.includes('perusahaan') || text.includes('customer') || text.includes('pelanggan')) {
    return 'Customers';
  }
  return 'Orders';
}

/**
 * Extract structured ERP items from raw table rows (supports PO / Garment Hierarchy)
 */
function extractItemsFromRows(headers: string[], rows: any[][]): Record<string, any>[] {
  const items: Record<string, any>[] = [];
  
  // Find column indices
  const hMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const clean = String(h || '').trim().toUpperCase();
    hMap[clean] = idx;
  });

  const getCol = (row: any[], possibleNames: string[]): any => {
    for (const name of possibleNames) {
      for (const [key, idx] of Object.entries(hMap)) {
        if (key.includes(name)) {
          const val = row[idx];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return val;
          }
        }
      }
    }
    return undefined;
  };

  let currentProject: any = null;
  let currentSizes: { size: string; qty: number; note?: string }[] = [];

  const finalizeCurrentProject = () => {
    if (currentProject) {
      let totalQty = currentProject.quantity || 0;
      if (currentSizes.length > 0) {
        const sizeSum = currentSizes.reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
        if (sizeSum > 0) totalQty = sizeSum;

        // Build structured sizeChart matrix
        const sizeCols = ['Ukuran', 'Jumlah (Qty)'];
        const sizeMatrixRows = currentSizes.map(s => [s.size, String(s.qty || 0)]);
        currentProject.sizeChart = JSON.stringify({
          columns: sizeCols,
          rows: sizeMatrixRows
        });
        currentProject.size = currentSizes.map(s => `${s.size}: ${s.qty}`).join(', ');
      }
      currentProject.quantity = totalQty || 1;
      currentProject.targetQty = totalQty || 1;
      items.push({ ...currentProject });
      currentProject = null;
      currentSizes = [];
    }
  };

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    const projectVal = getCol(row, ['PROJECT', 'ITEM', 'PEMESAN', 'CUSTOMER', 'NAMA', 'PRODUK', 'MODEL', 'BARANG']);
    const sizeVal = getCol(row, ['SIZE', 'UKURAN', 'SIZE CHART', 'ORDERAN']);
    const qtyVal = getCol(row, ['QUANTITY', 'QUANTTY', 'QTY', 'JUMLAH', 'TOTAL', 'PO', 'CUTTING']);
    const bahanVal = getCol(row, ['BAHAN', 'FABRIC', 'KAIN', 'MATERIAL']);
    const modelVal = getCol(row, ['MODEL', 'JENIS', 'TIPE', 'PRODUCT']);
    const warnaVal = getCol(row, ['WARNA', 'COLOR']);
    const statusVal = getCol(row, ['STATUS', 'KETERANGAN', 'PROSES', 'NOTE']);
    const deadlineVal = getCol(row, ['DEADLINE', 'TGL SELESAI', 'TARGET']);

    // Check if this row is starting a new project or continuing previous project with new size
    if (projectVal) {
      finalizeCurrentProject();

      currentProject = {
        id: `IMP-${Date.now()}-${items.length + 1}`,
        customerName: String(projectVal).trim(),
        customerId: '',
        productType: modelVal ? String(modelVal).trim() : 'Pakaian Konveksi',
        productName: modelVal ? String(modelVal).trim() : (bahanVal ? `${bahanVal} - ${projectVal}` : String(projectVal).trim()),
        material: bahanVal ? String(bahanVal).trim() : '',
        color: warnaVal ? String(warnaVal).trim() : '',
        quantity: Number(qtyVal) || 0,
        targetQty: Number(qtyVal) || 0,
        status: statusVal ? String(statusVal).trim() : 'Order',
        deadline: deadlineVal ? String(deadlineVal).trim() : '',
        notes: statusVal ? `Status: ${statusVal}` : 'Import dari File PO'
      };

      if (sizeVal && qtyVal) {
        currentSizes.push({
          size: String(sizeVal).trim(),
          qty: Number(qtyVal) || 1
        });
      }
    } else if (currentProject && sizeVal) {
      // Sub-row under existing project (like in UMAIR / BU LEXY / YASIN)
      currentSizes.push({
        size: String(sizeVal).trim(),
        qty: Number(qtyVal) || 1
      });
    } else if (!currentProject && (sizeVal || qtyVal)) {
      // Standalone row
      items.push({
        id: `IMP-${Date.now()}-${items.length + 1}`,
        customerName: 'Pelanggan PO',
        productType: modelVal ? String(modelVal) : 'Custom Garment',
        productName: modelVal ? String(modelVal) : 'Custom Garment',
        size: String(sizeVal || 'All Size'),
        quantity: Number(qtyVal) || 1,
        targetQty: Number(qtyVal) || 1,
        material: bahanVal ? String(bahanVal) : '',
        color: warnaVal ? String(warnaVal) : '',
        status: statusVal ? String(statusVal) : 'Order'
      });
    }
  }

  finalizeCurrentProject();
  return items;
}

/**
 * Parse Excel (.xlsx, .xls, .csv) file
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheets: ParsedSheet[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rawData.length === 0) continue;

      // Find first non-empty row to use as header
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        const validCells = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
        if (validCells.length >= 2) {
          headerRowIndex = i;
          break;
        }
      }

      const rawHeaders = rawData[headerRowIndex] || [];
      const headers = rawHeaders.map((h, idx) => (h && String(h).trim()) || `Kolom_${idx + 1}`);
      const rows = rawData.slice(headerRowIndex + 1);

      const suggestedTarget = detectTargetModule(headers, sheetName);
      const detectedItems = extractItemsFromRows(headers, rows);

      sheets.push({
        sheetName,
        headers,
        rawRows: rows,
        suggestedTarget,
        detectedItems
      });
    }

    return {
      fileName: file.name,
      fileType: file.name.endsWith('.csv') ? 'csv' : 'excel',
      sheets
    };
  } catch (err: any) {
    return {
      fileName: file.name,
      fileType: 'excel',
      sheets: [],
      error: `Gagal membaca file Excel: ${err.message || 'Format tidak valid'}`
    };
  }
}

/**
 * Parse Word (.docx) file
 */
export async function parseWordFile(file: File): Promise<ParseResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/import/word', {
      method: 'POST',
      body: formData
    });
    const resData = await response.json();
    if (!response.ok || !resData.success) {
      throw new Error(resData.error || 'Gagal membaca dokumen Word');
    }

    const rawLines = (resData.text || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
    const parser = new DOMParser();
    const doc = parser.parseFromString(resData.html || '', 'text/html');
    const tables = doc.querySelectorAll('table');

    const sheets: ParsedSheet[] = [];

    if (tables.length > 0) {
      tables.forEach((tbl, tIdx) => {
        const trs = Array.from(tbl.querySelectorAll('tr'));
        if (trs.length === 0) return;

        const tableData: string[][] = trs.map(tr => 
          Array.from(tr.querySelectorAll('th, td')).map(td => td.textContent?.trim() || '')
        );

        const headers = tableData[0] || [];
        const rows = tableData.slice(1);
        const suggestedTarget = detectTargetModule(headers, `Tabel ${tIdx + 1}`);
        const detectedItems = extractItemsFromRows(headers, rows);

        sheets.push({
          sheetName: `Tabel ${tIdx + 1}`,
          headers,
          rawRows: rows,
          suggestedTarget,
          detectedItems
        });
      });
    } else {
      // Parse plain text lines
      const headers = ['NO', 'ITEM', 'DETAIL'];
      const rows = rawLines.map((line, idx) => [String(idx + 1), line, '']);
      const detectedItems = rows.map((r, idx) => ({
        id: `IMP-${Date.now()}-${idx + 1}`,
        customerName: r[1],
        productType: 'Pesanan Word',
        productName: r[1],
        quantity: 1,
        status: 'Order'
      }));

      sheets.push({
        sheetName: 'Dokumen Word',
        headers,
        rawRows: rows,
        suggestedTarget: 'Orders',
        detectedItems
      });
    }

    return {
      fileName: file.name,
      fileType: 'word',
      sheets
    };
  } catch (err: any) {
    return {
      fileName: file.name,
      fileType: 'word',
      sheets: [],
      error: `Gagal membaca file Word: ${err.message || 'Pastikan file berformat .docx'}`
    };
  }
}

/**
 * Parse Clipboard / Textarea text (tab-separated or comma-separated)
 */
export function parseRawText(rawText: string): ParseResult {
  try {
    const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      return { fileName: 'Teks Tempel', fileType: 'text', sheets: [], error: 'Teks kosong.' };
    }

    // Determine delimiter (Tab or Comma or Semicolon)
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(',')) delimiter = ',';
    else if (firstLine.includes(';')) delimiter = ';';

    const rawRows = lines.map(l => l.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, '')));
    const headers = rawRows[0].map((h, i) => h || `Kolom_${i + 1}`);
    const rows = rawRows.slice(1);

    const suggestedTarget = detectTargetModule(headers, 'Paste');
    const detectedItems = extractItemsFromRows(headers, rows);

    return {
      fileName: 'Teks Tempel (Clipboard)',
      fileType: 'text',
      sheets: [{
        sheetName: 'Teks Clipboard',
        headers,
        rawRows: rows,
        suggestedTarget,
        detectedItems
      }]
    };
  } catch (err: any) {
    return {
      fileName: 'Teks Tempel',
      fileType: 'text',
      sheets: [],
      error: `Gagal memproses teks: ${err.message}`
    };
  }
}

/**
 * Generate downloadable sample template (Excel .xlsx)
 */
export function generateSampleExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Format PO & Pesanan
  const ws1Data = [
    ['NO', 'PROJECT', 'BAHAN', 'MODEL', 'WARNA', 'SIZE', 'QUANTITY', 'STATUS', 'DEADLINE'],
    [1, 'PT Mega Busana', 'Cotton Combed 30s', 'Kaos Polos LPD', 'Hitam', 'S', 20, 'Order', '2026-09-30'],
    ['', '', '', '', '', 'M', 50, '', ''],
    ['', '', '', '', '', 'L', 60, '', ''],
    ['', '', '', '', '', 'XL', 20, '', ''],
    [2, 'CV Cahaya Distro', 'Cotton Fleece 280gsm', 'Hoodie Zipper', 'Navy', 'M', 15, 'In Production', '2026-09-25'],
    ['', '', '', '', '', 'L', 25, '', ''],
    ['', '', '', '', '', 'XL', 10, '', '']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'Format Pesanan & PO');

  // Sheet 2: Format Data Pelanggan
  const ws2Data = [
    ['ID', 'NAMA_PELANGGAN', 'PERUSAHAAN', 'KONTAK_TELEPON', 'ALAMAT', 'STATUS'],
    ['CUST-001', 'Bapak Anton Wijaya', 'PT Sentosa Garmen', '08123456789', 'Jl. Industri No. 10 Bandung', 'Active'],
    ['CUST-002', 'Ibu Rina Melati', 'Distro Fashion Mall', '08219876543', 'Jl. Braga No. 25 Bandung', 'Active']
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  XLSX.utils.book_append_sheet(wb, ws2, 'Format Pelanggan');

  // Download
  XLSX.writeFile(wb, 'Template_Import_HIJ_Apps.xlsx');
}
